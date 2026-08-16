import { prisma } from "@/lib/prisma";
import { REPARTO_INICIAL, type Cuadrilla } from "@/lib/cuadrillas";

/**
 * Lectura y alta del reparto de cuadrillas.
 *
 * Separado de `cuadrillas.ts` para que la lógica —a quién le toca cada
 * localidad, cómo se describe una zona— se pueda probar sin base de datos.
 */

/**
 * Las cuadrillas, ordenadas por número.
 *
 * La primera vez que se consultan, si no hay ninguna, se siembra el reparto
 * acordado con el municipio. Así el sistema arranca funcionando en vez de
 * dejar todos los reclamos sin derivar hasta que alguien entre a configurarlo.
 */
export async function listarCuadrillas(): Promise<Cuadrilla[]> {
  const filas = await prisma.cuadrilla.findMany({
    orderBy: { numero: "asc" },
    select: { numero: true, localidades: true },
  });

  if (filas.length > 0) return filas;

  await prisma.cuadrilla.createMany({
    data: REPARTO_INICIAL,
    skipDuplicates: true,
  });

  return prisma.cuadrilla.findMany({
    orderBy: { numero: "asc" },
    select: { numero: true, localidades: true },
  });
}
