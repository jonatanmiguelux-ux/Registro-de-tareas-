import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { RolUsuario, EstadoUsuario } from "@prisma/client";

/**
 * Quién está usando la app, resuelto **contra la base**.
 *
 * El token de sesión alcanza para saber que hay alguien del otro lado, pero no
 * para decidir qué puede hacer: si un administrador le baja el rol o le quita
 * el acceso a alguien, el token que esa persona ya tiene en el celular sigue
 * diciendo lo de antes hasta que venza. Por eso el permiso se lee siempre de
 * la base, y un bloqueo tiene efecto en la petición siguiente.
 */

export type Usuario = {
  id: string;
  nombre: string | null;
  email: string | null;
  imagen: string | null;
  rol: RolUsuario;
  estado: EstadoUsuario;
};

/** El usuario de la petición actual, o null si no hay sesión válida. */
export async function usuarioActual(): Promise<Usuario | null> {
  const sesion = await auth();
  const id = sesion?.user?.id;
  if (!id) return null;

  const fila = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      rol: true,
      estado: true,
    },
  });

  if (!fila) return null;

  return {
    id: fila.id,
    nombre: fila.name,
    email: fila.email,
    imagen: fila.image,
    rol: fila.rol,
    estado: fila.estado,
  };
}

/**
 * Exige una sesión habilitada. Para usar al principio de cada pantalla.
 *
 * Redirige a la de acceso si no hay sesión, y a la de espera si la cuenta
 * todavía no fue aprobada o fue bloqueada.
 */
export async function requerirUsuario(): Promise<Usuario> {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/acceso");
  if (usuario.estado !== "ACTIVO") redirect("/acceso/pendiente");
  return usuario;
}

/** Igual que la anterior, pero además exige rol de administrador. */
export async function requerirAdministrador(): Promise<Usuario> {
  const usuario = await requerirUsuario();
  if (usuario.rol !== "ADMINISTRADOR") redirect("/");
  return usuario;
}

/**
 * Versión para los endpoints de la API, que no redirigen: devuelven el error.
 *
 * Cada endpoint decide qué hacer con el resultado; devolver 401/403 en JSON es
 * lo que espera el navegador cuando la llamada vino de la app y no de escribir
 * la dirección a mano.
 */
export async function usuarioDeApi(): Promise<
  { ok: true; usuario: Usuario } | { ok: false; respuesta: Response }
> {
  const usuario = await usuarioActual();

  if (!usuario) {
    return {
      ok: false,
      respuesta: Response.json(
        { error: "Hay que iniciar sesión." },
        { status: 401 },
      ),
    };
  }

  if (usuario.estado !== "ACTIVO") {
    return {
      ok: false,
      respuesta: Response.json(
        {
          error:
            "Tu cuenta todavía no está habilitada. Pedile a un administrador que te dé acceso.",
        },
        { status: 403 },
      ),
    };
  }

  return { ok: true, usuario };
}

/** Igual, pero sólo para administradores. */
export async function administradorDeApi(): Promise<
  { ok: true; usuario: Usuario } | { ok: false; respuesta: Response }
> {
  const resultado = await usuarioDeApi();
  if (!resultado.ok) return resultado;

  if (resultado.usuario.rol !== "ADMINISTRADOR") {
    return {
      ok: false,
      respuesta: Response.json(
        { error: "Esta acción es sólo para administradores." },
        { status: 403 },
      ),
    };
  }

  return resultado;
}
