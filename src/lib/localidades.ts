/**
 * Localidades del partido, con las abreviaturas que se escriben en el papel.
 *
 * En la planilla la columna "Localidad" nunca trae el nombre completo: se
 * anota la sigla. Guardar la sigla haría que el historial, los filtros y el
 * Excel salgan en un código que sólo entiende quien llenó la hoja, así que se
 * normaliza al ingresar y en la base queda el nombre completo.
 */
const POR_SIGLA: Record<string, string> = {
  na: "Nueva Atlantis",
  mda: "Mar de Ajó",
  ca: "Costa Azul",
  ll: "La Lucila",
  av: "Aguas Verdes",
  ce: "Costa del Este",
  mdt: "Mar del Tuyú",
  st: "Santa Teresita",
  cch: "Costa Chica",
  lt: "Las Toninas",
  sc: "San Clemente",
};

/** Las siglas y su nombre, para mostrar en pantalla y para el prompt. */
export const LOCALIDADES = Object.entries(POR_SIGLA).map(([sigla, nombre]) => ({
  sigla: sigla.toUpperCase(),
  nombre,
}));

const NOMBRES = new Set(Object.values(POR_SIGLA).map((n) => n.toLowerCase()));

/**
 * Convierte lo que se leyó en la columna "Localidad" al nombre completo.
 *
 * Acepta la sigla en cualquier combinación de mayúsculas y con o sin puntos
 * ("MdA", "mda", "M.d.A."), porque en el papel se escribe de las tres formas.
 * Si no reconoce el valor lo devuelve tal cual: es preferible conservar lo que
 * decía el papel a descartarlo por no estar en la lista.
 */
export function normalizarLocalidad(valor: string | null): string | null {
  const texto = valor?.trim();
  if (!texto) return null;

  // Ya viene con el nombre completo: se respeta la forma canónica.
  const comoNombre = texto.toLowerCase().replace(/\s+/g, " ");
  if (NOMBRES.has(comoNombre)) {
    return LOCALIDADES.find((l) => l.nombre.toLowerCase() === comoNombre)!.nombre;
  }

  const sigla = texto.toLowerCase().replace(/[\s.]/g, "");
  return POR_SIGLA[sigla] ?? texto;
}

/** Etiqueta para las filas que no traen localidad legible. */
export const SIN_LOCALIDAD = "Sin localidad";

/**
 * Orden en que se listan las localidades.
 *
 * Es el orden en que las nombra el municipio, no el alfabético: así el Excel
 * sale con el mismo recorrido con el que se piensa el partido. Para cambiarlo
 * alcanza con reordenar `POR_SIGLA` arriba.
 *
 * Lo que no está en la lista va después, alfabético entre sí, y las filas sin
 * localidad al final de todo: son las que hay que completar a mano, y sueltas
 * al final se ven de una.
 */
const ORDEN = new Map(
  Object.values(POR_SIGLA).map((nombre, indice) => [nombre, indice]),
);

export function ordenDeLocalidad(nombre: string | null): number {
  if (!nombre?.trim()) return Number.MAX_SAFE_INTEGER;
  return ORDEN.get(nombre) ?? Number.MAX_SAFE_INTEGER - 1;
}

/**
 * Compara dos localidades para ordenar.
 *
 * Las conocidas van en el orden del municipio; las que no reconocemos, entre
 * ellas, alfabéticamente; las vacías, al final.
 */
export function compararLocalidades(
  a: string | null,
  b: string | null,
): number {
  const ordenA = ordenDeLocalidad(a);
  const ordenB = ordenDeLocalidad(b);
  if (ordenA !== ordenB) return ordenA - ordenB;
  return (a ?? "").localeCompare(b ?? "", "es");
}

export type GrupoLocalidad<T> = {
  /** Nombre completo, o "Sin localidad" si la fila no traía nada. */
  localidad: string;
  filas: T[];
};

/**
 * Agrupa filas por localidad, sin importar cómo venía escrita en el papel.
 *
 * El valor ya llega normalizado desde la carga (`normalizarLocalidad`), así
 * que "ST", "St" y "Santa Teresita" son la misma cosa mucho antes de llegar
 * acá. Esta función se ocupa sólo de juntar y de poner los grupos en orden.
 */
export function agruparPorLocalidad<T>(
  filas: T[],
  obtenerLocalidad: (fila: T) => string | null,
): GrupoLocalidad<T>[] {
  const grupos = new Map<string, T[]>();

  for (const fila of filas) {
    const cruda = obtenerLocalidad(fila)?.trim();
    const clave = cruda ? normalizarLocalidad(cruda)! : SIN_LOCALIDAD;
    const actual = grupos.get(clave);
    if (actual) actual.push(fila);
    else grupos.set(clave, [fila]);
  }

  return [...grupos]
    .map(([localidad, filas]) => ({ localidad, filas }))
    .sort((a, b) =>
      compararLocalidades(
        a.localidad === SIN_LOCALIDAD ? null : a.localidad,
        b.localidad === SIN_LOCALIDAD ? null : b.localidad,
      ),
    );
}
