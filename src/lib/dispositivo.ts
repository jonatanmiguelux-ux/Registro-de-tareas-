import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { COOKIE_DISPOSITIVO } from "@/lib/dispositivo-cookie";

/**
 * Acceso desde el celular de una cuadrilla, sin cuenta de Google.
 *
 * El administrador genera un código para cada cuadrilla y arma un enlace con
 * él. Al abrir ese enlace en el teléfono del equipo, se guarda una galleta con
 * el código y ese celular queda fijado a esa cuadrilla: ve sólo sus reclamos y
 * nada más del municipio.
 *
 * El código es la llave. Vale lo que vale una contraseña compartida en un
 * teléfono de trabajo: alcanza para el caso, y se puede desactivar en cualquier
 * momento regenerándolo (el enlace viejo deja de servir). Por eso la galleta es
 * de larga duración —el operario no debería tener que reactivar el celular cada
 * dos por tres— pero el acceso está siempre a un clic de cortarse.
 */

/** Un año: un celular de cuadrilla no debería tener que reactivarse seguido. */
const DURACION = 60 * 60 * 24 * 365;

/** Genera un código nuevo, largo y al azar. */
export function generarTokenAcceso(): string {
  return randomBytes(24).toString("base64url");
}

export type Dispositivo = {
  /** Nº de la cuadrilla a la que quedó fijado el celular. */
  cuadrilla: number;
  localidades: string[];
};

/**
 * ¿Este celular está fijado a una cuadrilla? Se valida el código de la galleta
 * contra la base: si la cuadrilla lo regeneró, el celular deja de tener acceso.
 *
 * Devuelve null si no hay galleta, si el código ya no vale, o —importante— si
 * la petición trae además una sesión de Google: una cosa o la otra, nunca las
 * dos, para no mezclar identidades.
 */
export async function dispositivoActual(): Promise<Dispositivo | null> {
  const galletas = await cookies();
  const token = galletas.get(COOKIE_DISPOSITIVO)?.value;
  if (!token) return null;

  const cuadrilla = await prisma.cuadrilla.findUnique({
    where: { tokenAcceso: token },
    select: { numero: true, localidades: true },
  });
  if (!cuadrilla) return null;

  return { cuadrilla: cuadrilla.numero, localidades: cuadrilla.localidades };
}

/** Deja el celular fijado a la cuadrilla del código dado. Para la activación. */
export async function fijarDispositivo(token: string): Promise<void> {
  const galletas = await cookies();
  galletas.set(COOKIE_DISPOSITIVO, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: DURACION,
    path: "/",
  });
}
