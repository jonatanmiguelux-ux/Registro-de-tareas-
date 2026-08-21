"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";

/**
 * Cerrar sesión de verdad, a prueba del proxy de Render.
 *
 * Por qué no alcanza con `signOut({ redirectTo })` a secas: detrás del proxy,
 * Auth.js se confunde de dominio (el mismo lío que rompía el login), y su
 * redirect se iba al host interno de Render. Encima, si la cookie no queda
 * borrada, `/acceso` ve que todavía hay sesión y rebota a la app: la persona
 * aprieta "Salir" y sigue adentro.
 *
 * Por eso se hace en tres pasos, sin depender de que Auth.js adivine el host:
 *   1. `signOut` hace su limpieza normal (sin redirigir: su redirect es el
 *      que se iba al dominio equivocado).
 *   2. Un barrido a mano borra cualquier cookie de sesión que haya quedado,
 *      tenga el prefijo que tenga (`__Secure-`) o esté partida en pedazos.
 *   3. El redirect lo hace Next con una ruta relativa, que el navegador
 *      resuelve contra el dominio actual: nunca termina en el host de Render.
 */
async function cerrar(destino: string): Promise<never> {
  await signOut({ redirect: false });

  const galletas = await cookies();
  for (const galleta of galletas.getAll()) {
    if (galleta.name.includes("authjs") || galleta.name.includes("next-auth")) {
      galletas.delete(galleta.name);
    }
  }

  redirect(destino);
}

/** Municipio: vuelve a la pantalla de acceso. */
export async function cerrarSesionMunicipio() {
  await cerrar("/acceso");
}

/** Vecinos: vuelve al inicio del sitio. */
export async function cerrarSesionVecino() {
  await cerrar("/");
}
