import { prisma } from "@/lib/prisma";
import type { Material } from "@prisma/client";

/** Normaliza para comparar nombres de columnas sin que los separe una mayúscula. */
export function clave(nombre: string): string {
  return nombre.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function listarMateriales(): Promise<Material[]> {
  return prisma.material.findMany({
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
  });
}

/**
 * Los títulos que abarcan bloques de columnas, no columnas marcables.
 *
 * "Otras materiales" está tal cual porque así viene impreso en el papel: si el
 * modelo transcribe el título con su error de imprenta, hay que descartarlo
 * igual que a la versión corregida.
 */
const GRUPOS = new Set([
  "lámparas",
  "lamparas",
  "balastos",
  "otros materiales",
  "otras materiales",
]);

/**
 * Garantiza que exista una fila de catálogo por cada columna leída.
 *
 * El catálogo crece solo: la primera planilla que traiga una columna nueva la
 * da de alta. Así el sistema no depende de que alguien cargue la lista de
 * materiales antes de empezar a usarlo, y sigue andando si mañana el municipio
 * agrega una columna a la planilla.
 *
 * Devuelve un mapa de nombre normalizado -> material, para resolver las marcas.
 */
export async function asegurarMateriales(
  columnas: { nombre: string; grupo: string | null }[],
): Promise<Map<string, Material>> {
  const existentes = await listarMateriales();
  const mapa = new Map(existentes.map((m) => [clave(m.nombre), m]));
  let siguienteOrden =
    existentes.reduce((max, m) => Math.max(max, m.orden), 0) + 1;

  for (const columna of columnas) {
    const limpio = columna.nombre.trim();
    if (!limpio) continue;
    const k = clave(limpio);
    if (mapa.has(k)) continue;

    // Si el modelo confunde un título de grupo con una columna, no lo damos
    // de alta: ensuciaría el catálogo con un material que no existe.
    if (GRUPOS.has(k)) continue;

    const creado = await prisma.material.create({
      data: {
        nombre: limpio,
        grupo: columna.grupo?.trim() || null,
        unidad: "u",
        orden: siguienteOrden++,
      },
    });
    mapa.set(k, creado);
  }

  return mapa;
}
