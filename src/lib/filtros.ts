import type { Prisma } from "@prisma/client";
import { parsearFecha } from "@/lib/fechas";

/**
 * Filtros que comparten el historial, el tablero y la exportación.
 *
 * Están en un solo lugar a propósito: si el Excel filtrara distinto de lo que
 * muestra la pantalla, alguien exportaría un período creyendo que descarga lo
 * que está viendo.
 */
export type FiltrosReclamo = {
  desde: Date | null;
  hasta: Date | null;
  /** N.º de móvil. En la práctica es lo que identifica a la cuadrilla. */
  cuadrilla: string | null;
  estado: string | null;
  /** Búsqueda por N.º de incidente. */
  incidente: string | null;
};

export const ESTADOS = [
  { valor: "EN_REVISION", etiqueta: "En revisión" },
  { valor: "CONFIRMADA", etiqueta: "Confirmada" },
  { valor: "PROCESANDO", etiqueta: "Procesando" },
  { valor: "ERROR", etiqueta: "Error" },
] as const;

const ESTADOS_VALIDOS = new Set(ESTADOS.map((e) => e.valor));

/** Lee los filtros de la query string, ignorando lo que no sea válido. */
export function leerFiltros(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): FiltrosReclamo {
  const leer = (clave: string): string | null => {
    if (params instanceof URLSearchParams) return params.get(clave);
    const valor = params[clave];
    return Array.isArray(valor) ? (valor[0] ?? null) : (valor ?? null);
  };

  const limpiar = (valor: string | null) => {
    const texto = valor?.trim();
    return texto ? texto : null;
  };

  const estado = limpiar(leer("estado"));

  return {
    desde: parsearFecha(leer("desde")),
    hasta: parsearFecha(leer("hasta")),
    cuadrilla: limpiar(leer("cuadrilla")),
    estado: estado && ESTADOS_VALIDOS.has(estado as never) ? estado : null,
    incidente: limpiar(leer("incidente")),
  };
}

/** Traduce los filtros a un `where` de reclamos. */
export function whereReclamo(f: FiltrosReclamo): Prisma.ReclamoWhereInput {
  const where: Prisma.ReclamoWhereInput = {};

  if (f.desde || f.hasta) {
    where.fecha = {
      ...(f.desde ? { gte: f.desde } : {}),
      // Inclusivo: quien filtra "hasta el 31" espera ver el 31 completo.
      ...(f.hasta ? { lte: finDelDia(f.hasta) } : {}),
    };
  }

  if (f.cuadrilla) where.movil = f.cuadrilla;

  if (f.incidente) {
    where.nroIncidente = { contains: f.incidente, mode: "insensitive" };
  }

  if (f.estado) {
    where.planilla = { estado: f.estado as never };
  }

  return where;
}

/** El mismo filtro, pero expresado sobre planillas (para el historial). */
export function wherePlanilla(f: FiltrosReclamo): Prisma.PlanillaWhereInput {
  const where: Prisma.PlanillaWhereInput = {};

  if (f.estado) where.estado = f.estado as never;

  if (f.desde || f.hasta) {
    where.fecha = {
      ...(f.desde ? { gte: f.desde } : {}),
      ...(f.hasta ? { lte: finDelDia(f.hasta) } : {}),
    };
  }

  // Cuadrilla e incidente viven en el reclamo: la planilla entra si al menos
  // uno de sus reclamos cumple.
  const porReclamo: Prisma.ReclamoWhereInput = {};
  if (f.cuadrilla) porReclamo.movil = f.cuadrilla;
  if (f.incidente) {
    porReclamo.nroIncidente = { contains: f.incidente, mode: "insensitive" };
  }
  if (Object.keys(porReclamo).length > 0) {
    where.reclamos = { some: porReclamo };
  }

  return where;
}

export function finDelDia(fecha: Date): Date {
  return new Date(fecha.getTime() + 86_399_999);
}

export function hayFiltros(f: FiltrosReclamo): boolean {
  return Boolean(f.desde || f.hasta || f.cuadrilla || f.estado || f.incidente);
}

/** Vuelve a armar la query string, para links y para el botón de exportar. */
export function aQueryString(f: FiltrosReclamo): string {
  const params = new URLSearchParams();
  if (f.desde) params.set("desde", f.desde.toISOString().slice(0, 10));
  if (f.hasta) params.set("hasta", f.hasta.toISOString().slice(0, 10));
  if (f.cuadrilla) params.set("cuadrilla", f.cuadrilla);
  if (f.estado) params.set("estado", f.estado);
  if (f.incidente) params.set("incidente", f.incidente);
  return params.toString();
}
