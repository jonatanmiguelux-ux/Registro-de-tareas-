import type { RolUsuario } from "@prisma/client";

/**
 * La jerarquía de roles, sin nada del servidor alrededor.
 *
 * Vive en su propio archivo —y no en `sesion.ts`— porque las pantallas del
 * navegador también necesitan saber cómo se llama cada rol y quién está por
 * encima de quién. `sesion.ts` abre la base y lee la cookie: importarlo desde
 * un componente de cliente arrastraría todo eso al paquete que baja el celular.
 */

/**
 * De menos a más.
 *
 * Está acá y no en el esquema porque el orden de los valores de un enum de base
 * de datos es el orden en que se escribieron, no una jerarquía: agregar un rol
 * nuevo al final lo dejaría, sin querer, por encima de todos.
 */
export const ESCALERA: RolUsuario[] = [
  "OPERARIO",
  "ENCARGADO",
  "JEFE",
  "ADMINISTRADOR",
];

/** ¿`rol` llega al menos hasta `minimo`? */
export function alcanza(rol: RolUsuario, minimo: RolUsuario): boolean {
  return ESCALERA.indexOf(rol) >= ESCALERA.indexOf(minimo);
}

/** Cómo se llama cada rol en pantalla. */
export const NOMBRE_ROL: Record<RolUsuario, string> = {
  OPERARIO: "Operario",
  ENCARGADO: "Encargado",
  JEFE: "Jefe",
  ADMINISTRADOR: "Administrador",
};
