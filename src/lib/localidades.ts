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
