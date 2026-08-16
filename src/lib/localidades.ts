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

/**
 * Deja el texto comparable: sin mayúsculas, sin tildes y con un solo espacio.
 *
 * Las tildes importan más de lo que parece. Tres de las once localidades
 * llevan una —Mar de Ajó, Mar del Tuyú, Nueva Atlantis no— y quien escribe
 * casi nunca la pone: ni la IA que lee la letra manuscrita, ni alguien
 * tecleando rápido en un celular. Sin esto, "Mar de Ajo" no se reconocía como
 * Mar de Ajó, y el reclamo quedaba **sin cuadrilla asignada**: nadie lo
 * recibía y nadie se enteraba de que no lo había recibido.
 */
function comparable(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    // El rango va escrito con códigos y no con los caracteres: son signos
    // que no se ven, y en el código fuente eso es una trampa para el que
    // venga después.
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Índice de nombre comparable -> nombre canónico. */
const POR_NOMBRE = new Map(
  Object.values(POR_SIGLA).map((n) => [comparable(n), n]),
);

/**
 * Convierte lo que se leyó en la columna "Localidad" al nombre completo.
 *
 * Acepta la sigla en cualquier combinación de mayúsculas y con o sin puntos
 * ("MdA", "mda", "M.d.A."), porque en el papel se escribe de las tres formas,
 * y el nombre completo con o sin tildes.
 *
 * Si no reconoce el valor lo devuelve tal cual: es preferible conservar lo que
 * decía el papel a descartarlo por no estar en la lista.
 */
export function normalizarLocalidad(valor: string | null): string | null {
  const texto = valor?.trim();
  if (!texto) return null;

  // Ya viene con el nombre completo: se devuelve la forma canónica, con sus
  // tildes, para que en la base haya una sola escritura de cada localidad.
  const porNombre = POR_NOMBRE.get(comparable(texto));
  if (porNombre) return porNombre;

  const sigla = comparable(texto).replace(/[\s.]/g, "");
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
