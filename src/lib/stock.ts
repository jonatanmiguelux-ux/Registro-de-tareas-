import { prisma } from "@/lib/prisma";

export type FilaStock = {
  materialId: string;
  nombre: string;
  grupo: string | null;
  unidad: string | null;
  stockInicial: number;
  entradas: number;
  /** Salidas cargadas a mano: rotura, traspaso, faltante. */
  salidas: number;
  /** Consumo descontado solo de las planillas confirmadas. */
  consumo: number;
  stockActual: number;
};

/**
 * Stock por material.
 *
 *     actual = inicial + entradas - salidas manuales - consumo confirmado
 *
 * El consumo sale de los reclamos y sólo cuenta cuando la planilla está
 * confirmada: mientras está en revisión los números todavía pueden cambiar, y
 * descontarlos antes haría bailar el stock con cada corrección.
 */
export async function calcularStock(): Promise<FilaStock[]> {
  const [materiales, movimientos, consumos] = await Promise.all([
    prisma.material.findMany({ orderBy: [{ orden: "asc" }, { nombre: "asc" }] }),
    prisma.movimientoStock.groupBy({
      by: ["materialId", "tipo"],
      _sum: { cantidad: true },
    }),
    prisma.reclamoMaterial.groupBy({
      by: ["materialId"],
      where: { reclamo: { planilla: { estado: "CONFIRMADA" } } },
      _sum: { cantidad: true },
    }),
  ]);

  const entradas = new Map<string, number>();
  const salidas = new Map<string, number>();
  for (const m of movimientos) {
    const destino = m.tipo === "ENTRADA" ? entradas : salidas;
    destino.set(m.materialId, (destino.get(m.materialId) ?? 0) + (m._sum.cantidad ?? 0));
  }

  const consumoPorMaterial = new Map(
    consumos.map((c) => [c.materialId, c._sum.cantidad ?? 0]),
  );

  return materiales.map((material) => {
    const entrada = entradas.get(material.id) ?? 0;
    const salida = salidas.get(material.id) ?? 0;
    const consumo = consumoPorMaterial.get(material.id) ?? 0;
    return {
      materialId: material.id,
      nombre: material.nombre,
      grupo: material.grupo,
      unidad: material.unidad,
      stockInicial: material.stockInicial,
      entradas: entrada,
      salidas: salida,
      consumo,
      stockActual: material.stockInicial + entrada - salida - consumo,
    };
  });
}

/** Últimos movimientos cargados, para poder auditar y corregir. */
export async function ultimosMovimientos(limite = 30) {
  return prisma.movimientoStock.findMany({
    orderBy: [{ fecha: "desc" }, { creadoEn: "desc" }],
    take: limite,
    include: { material: { select: { nombre: true, unidad: true } } },
  });
}
