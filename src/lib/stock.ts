import { prisma } from "@/lib/prisma";
import { MOVILES } from "@/config/municipio";

/**
 * Stock en dos niveles: el pañol y los móviles.
 *
 *   PAÑOL (depósito central)
 *     enPañol = inicial + compras − bajas − entregado a los móviles
 *
 *   MÓVIL (cada camión)
 *     disponible = entregado al móvil − consumido en sus planillas confirmadas
 *
 * El material entra al pañol (una compra), el pañol lo entrega a un móvil, y el
 * móvil lo va gastando con las planillas. El consumo sólo cuenta cuando la
 * planilla está confirmada: mientras se revisa, los números todavía cambian.
 *
 * Sumando pañol + todos los móviles se vuelve al total de siempre
 * (inicial + compras − bajas − consumo): el material no se crea ni se pierde al
 * moverlo de un lado a otro, sólo cambia de bolsillo.
 */

export type FilaPanol = {
  materialId: string;
  nombre: string;
  grupo: string | null;
  unidad: string | null;
  stockInicial: number;
  /** Compras cargadas a mano (ENTRADA). */
  entradas: number;
  /** Bajas cargadas a mano: rotura, faltante (SALIDA). */
  salidas: number;
  /** Lo que salió del pañol hacia los móviles. */
  entregado: number;
  /** Lo que queda en el pañol. */
  enPanol: number;
};

export type FilaMovil = {
  materialId: string;
  nombre: string;
  grupo: string | null;
  unidad: string | null;
  /** Lo que el pañol le entregó a este móvil. */
  entregado: number;
  /** Lo que este móvil gastó en sus planillas confirmadas. */
  consumido: number;
  /** Lo que le queda disponible en el camión. */
  disponible: number;
};

export type StockDeMovil = { movil: number; filas: FilaMovil[] };

/**
 * Entregas sumadas por material y por móvil.
 *
 * Devuelve dos vistas de lo mismo: cuánto se entregó de cada material a cada
 * móvil (para el stock del móvil) y el total entregado de cada material (para
 * descontarlo del pañol).
 */
async function agregarEntregas() {
  const filas = await prisma.entregaMaterial.groupBy({
    by: ["movil", "materialId"],
    _sum: { cantidad: true },
  });

  const porMaterialMovil = new Map<string, Map<number, number>>();
  const totalPorMaterial = new Map<string, number>();
  for (const f of filas) {
    const cantidad = f._sum.cantidad ?? 0;
    if (!porMaterialMovil.has(f.materialId)) {
      porMaterialMovil.set(f.materialId, new Map());
    }
    const porMovil = porMaterialMovil.get(f.materialId)!;
    porMovil.set(f.movil, (porMovil.get(f.movil) ?? 0) + cantidad);
    totalPorMaterial.set(
      f.materialId,
      (totalPorMaterial.get(f.materialId) ?? 0) + cantidad,
    );
  }
  return { porMaterialMovil, totalPorMaterial };
}

/**
 * Consumo confirmado por material y por móvil.
 *
 * El móvil de cada gasto sale de la fila del reclamo, y si esa no lo dice, del
 * encabezado de la planilla. Se agrega en memoria porque el móvil vive en el
 * reclamo y no en la fila de material, y `groupBy` no cruza tablas.
 */
async function agregarConsumoPorMovil() {
  const filas = await prisma.reclamoMaterial.findMany({
    where: { reclamo: { planilla: { estado: "CONFIRMADA" } } },
    select: {
      materialId: true,
      cantidad: true,
      reclamo: {
        select: { movil: true, planilla: { select: { movil: true } } },
      },
    },
  });

  const porMaterialMovil = new Map<string, Map<number, number>>();
  for (const f of filas) {
    const texto = f.reclamo.movil ?? f.reclamo.planilla.movil;
    const movil = texto ? Number.parseInt(texto, 10) : Number.NaN;
    if (!Number.isFinite(movil)) continue; // sin móvil válido, no se le imputa a ninguno
    if (!porMaterialMovil.has(f.materialId)) {
      porMaterialMovil.set(f.materialId, new Map());
    }
    const porMovil = porMaterialMovil.get(f.materialId)!;
    porMovil.set(movil, (porMovil.get(movil) ?? 0) + f.cantidad);
  }
  return porMaterialMovil;
}

/** El stock del pañol (depósito central), por material. */
export async function stockPanol(): Promise<FilaPanol[]> {
  const [materiales, movimientos, entregas] = await Promise.all([
    prisma.material.findMany({ orderBy: [{ orden: "asc" }, { nombre: "asc" }] }),
    prisma.movimientoStock.groupBy({
      by: ["materialId", "tipo"],
      _sum: { cantidad: true },
    }),
    agregarEntregas(),
  ]);

  const entradas = new Map<string, number>();
  const salidas = new Map<string, number>();
  for (const m of movimientos) {
    const destino = m.tipo === "ENTRADA" ? entradas : salidas;
    destino.set(
      m.materialId,
      (destino.get(m.materialId) ?? 0) + (m._sum.cantidad ?? 0),
    );
  }

  return materiales.map((material) => {
    const entrada = entradas.get(material.id) ?? 0;
    const salida = salidas.get(material.id) ?? 0;
    const entregado = entregas.totalPorMaterial.get(material.id) ?? 0;
    return {
      materialId: material.id,
      nombre: material.nombre,
      grupo: material.grupo,
      unidad: material.unidad,
      stockInicial: material.stockInicial,
      entradas: entrada,
      salidas: salida,
      entregado,
      enPanol: material.stockInicial + entrada - salida - entregado,
    };
  });
}

/** El stock de cada móvil configurado, por material. */
export async function stockPorMovil(): Promise<StockDeMovil[]> {
  const [materiales, entregas, consumo] = await Promise.all([
    prisma.material.findMany({ orderBy: [{ orden: "asc" }, { nombre: "asc" }] }),
    agregarEntregas(),
    agregarConsumoPorMovil(),
  ]);

  return MOVILES.map((movil) => ({
    movil,
    filas: materiales.map((material) => {
      const entregado = entregas.porMaterialMovil.get(material.id)?.get(movil) ?? 0;
      const consumido = consumo.get(material.id)?.get(movil) ?? 0;
      return {
        materialId: material.id,
        nombre: material.nombre,
        grupo: material.grupo,
        unidad: material.unidad,
        entregado,
        consumido,
        disponible: entregado - consumido,
      };
    }),
  }));
}

/** Últimos movimientos de depósito (compras y bajas), para auditar. */
export async function ultimosMovimientos(limite = 30) {
  return prisma.movimientoStock.findMany({
    orderBy: [{ fecha: "desc" }, { creadoEn: "desc" }],
    take: limite,
    include: { material: { select: { nombre: true, unidad: true } } },
  });
}

/** Últimas entregas del pañol a los móviles, para auditar. */
export async function ultimasEntregas(limite = 30) {
  return prisma.entregaMaterial.findMany({
    orderBy: [{ fecha: "desc" }, { creadoEn: "desc" }],
    take: limite,
    include: { material: { select: { nombre: true, unidad: true } } },
  });
}
