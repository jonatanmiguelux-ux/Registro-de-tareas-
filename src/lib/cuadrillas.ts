import { normalizarLocalidad } from "@/lib/localidades";

/**
 * Zonas de trabajo: qué cuadrilla atiende cada localidad.
 *
 * Los tramos son contiguos sobre el orden en que el municipio nombra las
 * localidades, que resulta ser el recorrido de la costa. Por eso las zonas se
 * describen como "de tal a tal" y no como listas sueltas: son tramos de ruta,
 * no agrupaciones arbitrarias.
 *
 * El número de cuadrilla es el mismo que el **Móvil N.º** de la planilla de
 * papel: es lo que identifica al equipo que sale, y lo que permite cruzar un
 * reclamo de vecino con el trabajo que después aparece en la planilla.
 */

export type Cuadrilla = {
  numero: number;
  /** Cómo se describe la zona, para mostrar en pantalla. */
  zona: string;
  localidades: string[];
};

export const CUADRILLAS: Cuadrilla[] = [
  {
    numero: 1,
    zona: "Nueva Atlantis y Mar de Ajó",
    localidades: ["Nueva Atlantis", "Mar de Ajó"],
  },
  {
    numero: 2,
    zona: "De Costa Azul a Mar del Tuyú",
    localidades: [
      "Costa Azul",
      "La Lucila",
      "Aguas Verdes",
      "Costa del Este",
      "Mar del Tuyú",
    ],
  },
  {
    numero: 3,
    zona: "Santa Teresita y Costa Chica",
    localidades: ["Santa Teresita", "Costa Chica"],
  },
  {
    numero: 4,
    zona: "De Las Toninas a San Clemente",
    localidades: ["Las Toninas", "San Clemente"],
  },
];

const POR_LOCALIDAD = new Map<string, number>(
  CUADRILLAS.flatMap((c) => c.localidades.map((l) => [l, c.numero])),
);

/**
 * A qué cuadrilla le toca una localidad.
 *
 * Devuelve null si la localidad no está en ninguna zona: puede ser un lugar
 * fuera del partido, o uno nuevo que todavía no se repartió. Esos reclamos no
 * se pierden —quedan sin asignar y a la vista— porque adivinar una cuadrilla
 * mandaría a un equipo a un lugar que no le toca.
 */
export function cuadrillaDeLocalidad(localidad: string | null): number | null {
  const nombre = normalizarLocalidad(localidad);
  if (!nombre) return null;
  return POR_LOCALIDAD.get(nombre) ?? null;
}

export function zonaDeCuadrilla(numero: number | null): string | null {
  if (numero === null) return null;
  return CUADRILLAS.find((c) => c.numero === numero)?.zona ?? null;
}
