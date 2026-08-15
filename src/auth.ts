import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
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
     * La primera cuenta del sistema queda administradora y activa.
     *
     * Se hace en `createUser`, que corre una sola vez por persona y después de
     * que la fila existe: contarlas en el callback de `signIn` daría cero para
     * todos los que entren a la vez en el arranque.
     */
    async createUser({ user }) {
      if (!user.id) return;
      const cuantas = await prisma.user.count();
      if (cuantas === 1) {
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
