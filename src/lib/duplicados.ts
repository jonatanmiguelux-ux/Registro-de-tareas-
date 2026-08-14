import { prisma } from "@/lib/prisma";

export type Coincidencia = {
  reclamoId: string;
  planillaId: string;
  archivoNombre: string;
  fecha: string | null;
  nroIncidente: string | null;
  direccion: string;
  localidad: string | null;
  /** true si el choque es con otra fila de la MISMA planilla. */
  mismaPlanilla: boolean;
};

export type AvisoDuplicado = {
  reclamoId: string;
  motivo: "incidente" | "direccion";
  coincidencias: Coincidencia[];
};

function normalizar(valor: string | null): string {
  return (valor ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function direccionDe(r: { calle: string | null; numero: string | null }): string {
  return [r.calle, r.numero].filter(Boolean).join(" ").trim();
}

/**
 * Busca reclamos de esta planilla que parezcan ya estar cargados.
 *
 * Dos señales, de más a menos fuerte:
 *
 * 1. **Mismo N.º de incidente.** Es un identificador: repetirlo es casi
 *    siempre la misma planilla cargada dos veces.
 * 2. **Misma fecha, localidad y dirección.** Más débil —una cuadrilla puede
 *    volver al mismo poste el mismo día— así que se avisa, no se bloquea.
 *
 * Devuelve avisos, nunca impide guardar: quien tiene el papel adelante decide.
 */
export async function detectarDuplicados(
  planillaId: string,
): Promise<AvisoDuplicado[]> {
  const propios = await prisma.reclamo.findMany({
    where: { planillaId },
    select: {
      id: true,
      fecha: true,
      localidad: true,
      calle: true,
      numero: true,
      nroIncidente: true,
    },
    orderBy: { orden: "asc" },
  });

  if (propios.length === 0) return [];

  const incidentes = [
    ...new Set(propios.map((r) => r.nroIncidente).filter((n): n is string => !!n?.trim())),
  ];

  const fechas = [
    ...new Set(propios.map((r) => r.fecha?.getTime()).filter((f): f is number => !!f)),
  ].map((t) => new Date(t));

  // Un solo viaje a la base por señal, en vez de una consulta por fila.
  const [porIncidente, porFecha] = await Promise.all([
    incidentes.length > 0
      ? prisma.reclamo.findMany({
          where: { nroIncidente: { in: incidentes } },
          select: seleccion,
        })
      : Promise.resolve([]),
    fechas.length > 0
      ? prisma.reclamo.findMany({
          where: { fecha: { in: fechas } },
          select: seleccion,
        })
      : Promise.resolve([]),
  ]);

  const avisos: AvisoDuplicado[] = [];

  for (const propio of propios) {
    const coincidencias = new Map<string, Coincidencia>();
    let motivo: "incidente" | "direccion" = "direccion";

    const incidente = normalizar(propio.nroIncidente);
    if (incidente) {
      for (const otro of porIncidente) {
        if (otro.id === propio.id) continue;
        if (normalizar(otro.nroIncidente) !== incidente) continue;
        coincidencias.set(otro.id, aCoincidencia(otro, planillaId));
        motivo = "incidente";
      }
    }

    // La dirección sólo se evalúa si el incidente no dio nada: si ya sabemos
    // que el identificador se repite, agregar "y además la misma calle" no
    // aporta a la decisión.
    if (coincidencias.size === 0) {
      const direccion = normalizar(direccionDe(propio));
      const localidad = normalizar(propio.localidad);
      if (direccion) {
        for (const otro of porFecha) {
          if (otro.id === propio.id) continue;
          if (otro.fecha?.getTime() !== propio.fecha?.getTime()) continue;
          if (normalizar(direccionDe(otro)) !== direccion) continue;
          if (normalizar(otro.localidad) !== localidad) continue;
          coincidencias.set(otro.id, aCoincidencia(otro, planillaId));
        }
      }
    }

    if (coincidencias.size > 0) {
      avisos.push({
        reclamoId: propio.id,
        motivo,
        coincidencias: [...coincidencias.values()],
      });
    }
  }

  return avisos;
}

const seleccion = {
  id: true,
  planillaId: true,
  fecha: true,
  localidad: true,
  calle: true,
  numero: true,
  nroIncidente: true,
  planilla: { select: { archivoNombre: true } },
} as const;

type FilaCruda = {
  id: string;
  planillaId: string;
  fecha: Date | null;
  localidad: string | null;
  calle: string | null;
  numero: string | null;
  nroIncidente: string | null;
  planilla: { archivoNombre: string };
};

function aCoincidencia(fila: FilaCruda, planillaActual: string): Coincidencia {
  return {
    reclamoId: fila.id,
    planillaId: fila.planillaId,
    archivoNombre: fila.planilla.archivoNombre,
    fecha: fila.fecha?.toISOString() ?? null,
    nroIncidente: fila.nroIncidente,
    direccion: direccionDe(fila),
    localidad: fila.localidad,
    mismaPlanilla: fila.planillaId === planillaActual,
  };
}
