import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

/**
 * Acceso a la app: iniciar sesión con Google y esperar aprobación.
 *
 * Google contesta **quién sos**, no si tenés permiso. Cualquiera con un Gmail
 * puede iniciar sesión, así que la cuenta nace en estado PENDIENTE y no ve
 * nada hasta que un administrador la habilita.
 *
 * La primera cuenta que entra al sistema queda como administradora y activa:
 * si no, no habría nadie que pudiera aprobar a nadie y la app arrancaría
 * trabada.
 *
 * **La sesión es un JWT y no una fila en la base.** El middleware corre en el
 * borde, donde Prisma no llega, así que necesita poder verificar la sesión sin
 * consultar la base. La contracara es que el token no se entera al instante de
 * un cambio de rol o de un bloqueo: por eso el permiso de verdad no se
 * resuelve leyendo el token sino contra la base, en `sesion.ts`. El token sólo
 * sirve para saber si hay alguien del otro lado.
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Google],
  // Confiar en el dominio que llega por la cabecera, en vez de en una
  // dirección fija. Es lo que permite que la misma app atienda dos dominios
  // —el del municipio y el del vecino— y que cada login vuelva al suyo. El
  // proxy pone el dominio real en `x-forwarded-host`; detrás del servidor de
  // Render, esa cabecera es de confianza.
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/acceso",
    error: "/acceso",
  },
  callbacks: {
    async jwt({ token, user }) {
      // `user` sólo viene en el login; después el token viaja solo.
      if (user?.id) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
  events: {
    /**
     * Decide qué clase de cuenta es la que se acaba de crear.
     *
     * Se hace en `createUser`, que corre una sola vez por persona y después de
     * que la fila existe.
     *
     * **Un vecino queda activo al instante y un empleado queda en espera.** La
     * diferencia la marca una galleta que deja la pantalla de ingreso del
     * vecino justo antes de mandar a Google (ver `marcarAltaDeVecino`): es lo
     * único que distingue de qué lado del mostrador vino la persona, porque
     * Google contesta lo mismo en los dos casos.
     *
     * Si esa marca no está, la cuenta nace como personal y en espera. Ante la
     * duda, el lado seguro es el que pide aprobación.
     */
    async createUser({ user }) {
      if (!user.id) return;

      const galletas = await cookies();
      const esVecino = galletas.get(MARCA_VECINO)?.value === "1";

      if (esVecino) {
        // No necesita que nadie lo habilite: sólo va a poder cargar reclamos
        // y ver los suyos. Nunca ve nada del municipio.
        await prisma.user.update({
          where: { id: user.id },
          data: { tipo: "VECINO", estado: "ACTIVO" },
        });
        return;
      }

      // La primera cuenta del personal queda administradora: si no, no habría
      // nadie que pudiera aprobar a nadie y la app arrancaría trabada.
      const empleados = await prisma.user.count({ where: { tipo: "PERSONAL" } });
      if (empleados === 1) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            rol: "ADMINISTRADOR",
            estado: "ACTIVO",
            habilitadoEn: new Date(),
            habilitadoPor: "primera cuenta del sistema",
          },
        });
      }
    },
  },
});

/** Nombre de la galleta que marca que el alta viene del lado del vecino. */
export const MARCA_VECINO = "alta-vecino";

/**
 * Deja la marca antes de mandar a Google.
 *
 * Dura poco: sólo tiene que sobrevivir la ida y vuelta al proveedor. Si
 * quedara mucho tiempo, alguien que entró como vecino y después intenta
 * entrar como empleado se crearía la cuenta del lado equivocado.
 */
export async function marcarAltaDeVecino() {
  const galletas = await cookies();
  galletas.set(MARCA_VECINO, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
    path: "/",
  });
}
