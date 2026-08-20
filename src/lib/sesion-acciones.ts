"use server";

import { signOut } from "@/auth";

/**
 * Cerrar sesión, de verdad.
 *
 * Se hace con un server action y no con un `<form>` que apunte directo a
 * `/api/auth/signout`: ese POST necesita un token CSRF que el formulario a mano
 * no manda, así que Auth.js lo rechazaba y la sesión nunca se cerraba.
 * `signOut()` arma ese token por dentro y limpia la cookie como corresponde.
 *
 * El destino es una ruta relativa a propósito: así el redirect se queda en el
 * mismo dominio desde el que se cerró la sesión (municipio o vecinos), sin
 * cruzar de un sitio al otro.
 */

/** Municipio: vuelve a la pantalla de acceso. */
export async function cerrarSesionMunicipio() {
  await signOut({ redirectTo: "/acceso" });
}

/** Vecinos: vuelve al inicio del sitio. */
export async function cerrarSesionVecino() {
  await signOut({ redirectTo: "/" });
}
