import { prisma } from "@/lib/prisma";
import { whereReclamo, type FiltrosReclamo } from "@/lib/filtros";

export type Totales = {
  reclamos: number;
  /** Reclamos que están en una planilla todavía sin confirmar. */
  pendientes: number;
  /** Unidades de material consumidas en los reclamos del período. */
  materialesUsados: number;
  planillas: number;
  /** Filas que la IA leyó con dudas y nadie revisó todavía. */
  dudosos: number;
};

export async function totales(f: FiltrosReclamo): Promise<Totales> {
  const where = whereReclamo(f);

  const [reclamos, pendientes, dudosos, materiales, planillas] =
    await Promise.all([
      prisma.reclamo.count({ where }),
      // Con AND en vez de mezclar el filtro anidado: así respeta el filtro de
      // estado que ya venga en `where` en lugar de pisarlo.
      prisma.reclamo.count({
        where: { AND: [where, { planilla: { estado: { not: "CONFIRMADA" } } }] },
      }),
      prisma.reclamo.count({ where: { ...where, confianza: "baja", revisado: false } }),
      prisma.reclamoMaterial.aggregate({
        where: { reclamo: where },
        _sum: { cantidad: true },
      }),
      prisma.reclamo
        .findMany({ where, select: { planillaId: true }, distinct: ["planillaId"] })
        .then((filas) => filas.length),
    ]);

  return {
    reclamos,
    pendientes,
    dudosos,
    materialesUsados: materiales._sum.cantidad ?? 0,
    planillas,
  };
}

export type ConsumoMaterial = {
  materialId: string;
  nombre: string;
  grupo: string | null;
  unidad: string | null;
  cantidad: number;
  /** En cuántos reclamos distintos apareció. */
  reclamos: number;
};

/** Consumo por tipo de material, de mayor a menor. */
export async function consumoPorMaterial(
  f: FiltrosReclamo,
): Promise<ConsumoMaterial[]> {
  const where = whereReclamo(f);

  const [agrupado, catalogo] = await Promise.all([
    prisma.reclamoMaterial.groupBy({
      by: ["materialId"],
      where: { reclamo: where },
      _sum: { cantidad: true },
      _count: { _all: true },
    }),
    prisma.material.findMany({
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    }),
  ]);

  const porId = new Map(agrupado.map((g) => [g.materialId, g]));

  return catalogo
    .map((material) => {
      const fila = porId.get(material.id);
      return {
        materialId: material.id,
        nombre: material.nombre,
        grupo: material.grupo,
        unidad: material.unidad,
        cantidad: fila?._sum.cantidad ?? 0,
        reclamos: fila?._count._all ?? 0,
      };
    })
    .filter((m) => m.cantidad > 0)
    .sort((a, b) => b.cantidad - a.cantidad);
}

export type DiaResumen = {
  /** AAAA-MM-DD */
  fecha: string;
  reclamos: number;
  materiales: number;
  cuadrillas: string[];
};

/**
 * Resumen día por día del período filtrado.
 *
 * Agrega en memoria en vez de con SQL crudo: la carga diaria de un municipio
 * son decenas de reclamos, y así el conteo de materiales por día sale de la
 * misma consulta que el de reclamos, sin poder desincronizarse.
 */
export async function resumenDiario(f: FiltrosReclamo): Promise<DiaResumen[]> {
  const filas = await prisma.reclamo.findMany({
    where: whereReclamo(f),
    select: {
      fecha: true,
      movil: true,
      materiales: { select: { cantidad: true } },
    },
  });

  const porDia = new Map<string, { reclamos: number; materiales: number; cuadrillas: Set<string> }>();

  for (const fila of filas) {
    const clave = fila.fecha ? fila.fecha.toISOString().slice(0, 10) : "sin-fecha";
    const dia =
      porDia.get(clave) ??
      { reclamos: 0, materiales: 0, cuadrillas: new Set<string>() };
    dia.reclamos += 1;
    dia.materiales += fila.materiales.reduce((t, m) => t + m.cantidad, 0);
    if (fila.movil) dia.cuadrillas.add(fila.movil);
    porDia.set(clave, dia);
  }

  return [...porDia]
    .map(([fecha, d]) => ({
      fecha,
      reclamos: d.reclamos,
      materiales: d.materiales,
      cuadrillas: [...d.cuadrillas].sort(),
    }))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

/** Móviles presentes en los datos, para poblar el filtro de cuadrilla. */
export async function cuadrillas(): Promise<string[]> {
  const filas = await prisma.reclamo.findMany({
    where: { movil: { not: null } },
    select: { movil: true },
    distinct: ["movil"],
  });
  return filas
    .map((f) => f.movil!)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
}
