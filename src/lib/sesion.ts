import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { RolUsuario, EstadoUsuario, TipoUsuario } from "@prisma/client";
import { alcanza, NOMBRE_ROL } from "@/lib/roles";

// Se reexportan para que quien ya pide permisos desde acá no tenga que
// importar de dos lados.
export { alcanza, NOMBRE_ROL };

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
  tipo: TipoUsuario;
  rol: RolUsuario;
  estado: EstadoUsuario;
  /** Nº de cuadrilla a la que pertenece, o null si no está en ninguna. */
  cuadrilla: number | null;
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
      tipo: true,
      rol: true,
      estado: true,
      cuadrilla: true,
    },
  });

  if (!fila) return null;

  return {
    id: fila.id,
    nombre: fila.name,
    email: fila.email,
    imagen: fila.image,
    tipo: fila.tipo,
    rol: fila.rol,
    estado: fila.estado,
    cuadrilla: fila.cuadrilla,
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
  // Una cuenta de vecino no entra acá ni aunque tenga sesión válida. En
  // producción los dominios ya las separan; esto cubre el caso de que un día
  // convivan en uno solo, y es la clase de control que conviene tener aunque
  // parezca redundante.
  if (usuario.tipo === "VECINO") redirect("/alumbrado");
  if (usuario.estado !== "ACTIVO") redirect("/acceso/pendiente");
  return usuario;
}

/**
 * Exige una sesión de vecino. Para la app pública.
 *
 * Un empleado que entre por el lado del vecino pasa igual: no tiene sentido
 * impedirle reportar una luz quemada en su cuadra por trabajar en el
 * municipio.
 */
export async function requerirVecino(): Promise<Usuario> {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/ingresar");
  return usuario;
}

/**
 * Exige una sesión habilitada con al menos cierto rol.
 *
 * Quien no llega vuelve al inicio en vez de ver un error: no le sirve saber
 * que existe una pantalla a la que no puede entrar.
 */
export async function requerirRol(minimo: RolUsuario): Promise<Usuario> {
  const usuario = await requerirUsuario();
  if (!alcanza(usuario.rol, minimo)) redirect("/");
  return usuario;
}

/** Atajo para lo que sólo puede el administrador: asignar roles. */
export async function requerirAdministrador(): Promise<Usuario> {
  return requerirRol("ADMINISTRADOR");
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

  if (usuario.tipo === "VECINO") {
    return {
      ok: false,
      respuesta: Response.json(
        { error: "Esta cuenta no tiene acceso al sistema del municipio." },
        { status: 403 },
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

/**
 * Sesión de vecino para los endpoints públicos.
 *
 * No exige que la cuenta esté habilitada: un vecino no necesita aprobación de
 * nadie para reportar una luz quemada.
 */
export async function vecinoDeApi(): Promise<
  { ok: true; usuario: Usuario } | { ok: false; respuesta: Response }
> {
  const usuario = await usuarioActual();

  if (!usuario) {
    return {
      ok: false,
      respuesta: Response.json(
        { error: "Hay que iniciar sesión para cargar un reclamo." },
        { status: 401 },
      ),
    };
  }

  return { ok: true, usuario };
}

/** Igual, pero exigiendo al menos cierto rol. */
export async function rolDeApi(
  minimo: RolUsuario,
): Promise<
  { ok: true; usuario: Usuario } | { ok: false; respuesta: Response }
> {
  const resultado = await usuarioDeApi();
  if (!resultado.ok) return resultado;

  if (!alcanza(resultado.usuario.rol, minimo)) {
    return {
      ok: false,
      respuesta: Response.json(
        {
          error: `Esta acción es para ${NOMBRE_ROL[minimo].toLowerCase()} en adelante.`,
        },
        { status: 403 },
      ),
    };
  }

  return resultado;
}

/** Sólo administradores. Lo que define quién es quién. */
export async function administradorDeApi() {
  return rolDeApi("ADMINISTRADOR");
}
