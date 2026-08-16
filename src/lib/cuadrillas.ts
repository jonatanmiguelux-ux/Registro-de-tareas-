import { normalizarLocalidad, LOCALIDADES } from "@/lib/localidades";

/**
 * Zonas de trabajo: qué cuadrilla atiende cada localidad.
 *
 * El reparto **vive en la base** y se administra desde la app del municipio.
 * Acá está sólo la lógica, escrita como funciones puras que reciben las
 * cuadrillas: así se puede probar sin base de datos, y la parte que consulta
 * queda en `cuadrillas-db.ts`.
 */

export type Cuadrilla = {
  numero: number;
  localidades: string[];
};

/**
 * Reparto con el que arranca el sistema, hasta que alguien lo cambie desde la
 * app. Es el que acordó el municipio.
 */
export const REPARTO_INICIAL: Cuadrilla[] = [
  { numero: 1, localidades: ["Nueva Atlantis", "Mar de Ajó"] },
  {
    numero: 2,
    localidades: [
      "Costa Azul",
      "La Lucila",
      "Aguas Verdes",
      "Costa del Este",
      "Mar del Tuyú",
    ],
  },
  { numero: 3, localidades: ["Santa Teresita", "Costa Chica"] },
  { numero: 4, localidades: ["Las Toninas", "San Clemente"] },
];

/**
 * A qué cuadrilla le toca una localidad.
 *
 * Devuelve null si no está repartida: puede ser un lugar fuera del partido, o
 * uno que quedó sin asignar. Esos reclamos no se pierden —quedan a la vista en
 * la bandeja— porque adivinar una cuadrilla mandaría a un equipo a un lugar
 * que no le toca.
 */
export function cuadrillaDeLocalidad(
  localidad: string | null,
  cuadrillas: Cuadrilla[],
): number | null {
  const nombre = normalizarLocalidad(localidad);
  if (!nombre) return null;
  return cuadrillas.find((c) => c.localidades.includes(nombre))?.numero ?? null;
}

/**
 * Describe la zona de una cuadrilla en una línea.
 *
 * Se arma sola a partir de las localidades, en el orden en que el municipio
 * las nombra —que es el recorrido de la costa—, así que nunca queda diciendo
 * algo que dejó de ser cierto. Un texto escrito a mano sí se desactualizaría
 * en cuanto alguien cambiara el reparto.
 */
export function describirZona(localidades: string[]): string {
  const orden = LOCALIDADES.map((l) => l.nombre);
  const ordenadas = [...localidades].sort(
    (a, b) => orden.indexOf(a) - orden.indexOf(b),
  );

  if (ordenadas.length === 0) return "Sin localidades asignadas";
  if (ordenadas.length === 1) return ordenadas[0];
  if (ordenadas.length === 2) return `${ordenadas[0]} y ${ordenadas[1]}`;

  // Con tres o más se describe como tramo, que es como lo dice el municipio.
  // Sólo si son contiguas: salteadas, "de X a Y" mentiría sobre el medio.
  const posiciones = ordenadas.map((l) => orden.indexOf(l));
  const contiguas = posiciones.every(
    (p, i) => i === 0 || p === posiciones[i - 1] + 1,
  );

  return contiguas
    ? `De ${ordenadas[0]} a ${ordenadas.at(-1)}`
    : ordenadas.join(" · ");
}

/** Las localidades del partido que todavía no le tocan a nadie. */
export function localidadesSinAsignar(cuadrillas: Cuadrilla[]): string[] {
  const asignadas = new Set(cuadrillas.flatMap((c) => c.localidades));
  return LOCALIDADES.map((l) => l.nombre).filter((n) => !asignadas.has(n));
}
