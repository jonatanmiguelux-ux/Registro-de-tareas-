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

/**
 * ¿`rol` llega al menos hasta `minimo`?
 *
 * El Pañolero queda **afuera** de la escalera: no está en `ESCALERA`, así que
 * `indexOf` da -1 y nunca "alcanza" un rol de la jerarquía. Es a propósito: su
 * permiso no es un nivel, es una llave a una sola puerta (ver `puedeVerPanol`).
 */
export function alcanza(rol: RolUsuario, minimo: RolUsuario): boolean {
  return ESCALERA.indexOf(rol) >= ESCALERA.indexOf(minimo);
}

/** La persona del pañol: ve sólo esa pantalla, nada del resto del sistema. */
export function esPanolero(rol: RolUsuario): boolean {
  return rol === "PANOLERO";
}

/**
 * ¿Puede entrar al pañol? El pañolero (su lugar) y el jefe en adelante, que
 * supervisan. Un operario o encargado no maneja el depósito central.
 */
export function puedeVerPanol(rol: RolUsuario): boolean {
  return rol === "PANOLERO" || alcanza(rol, "JEFE");
}

/** El stock por móvil es cosa de jefes y encargados. */
export function puedeVerStockMoviles(rol: RolUsuario): boolean {
  return alcanza(rol, "ENCARGADO");
}

/**
 * Todos los roles que un administrador puede asignar: la escalera más el
 * pañolero, que va fuera de ella pero también se elige desde Cuentas.
 */
export const ROLES_ASIGNABLES: RolUsuario[] = [...ESCALERA, "PANOLERO"];

/** Cómo se llama cada rol en pantalla. */
export const NOMBRE_ROL: Record<RolUsuario, string> = {
  OPERARIO: "Operario",
  ENCARGADO: "Encargado",
  JEFE: "Jefe",
  ADMINISTRADOR: "Administrador",
  PANOLERO: "Pañolero",
};
