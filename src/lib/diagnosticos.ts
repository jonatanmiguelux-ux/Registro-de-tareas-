/**
 * Códigos de diagnóstico que se escriben en la zona de materiales.
 *
 * En el papel conviven con las marcas de material, pero no son un material:
 * dicen qué se encontró o qué se hizo en la visita. Por eso van en un campo
 * propio del reclamo y no en `ReclamoMaterial`, que contaría consumo que no
 * existió y descontaría stock de más.
 *
 * "AD" también se escribe ahí y sí es un material (Adaptador): ése no entra
 * en esta lista, se resuelve por catálogo.
 */
const POR_SIGLA: Record<string, string> = {
  cc: "Cable Cortado",
  fc: "Falso Contacto",
  fn: "Funciona Normal",
};

export const DIAGNOSTICOS = Object.entries(POR_SIGLA).map(([sigla, nombre]) => ({
  // Se muestra con la barra, que es como está escrito en el papel.
  sigla: `${sigla[0].toUpperCase()}/${sigla[1].toUpperCase()}`,
  nombre,
}));

const NOMBRES = new Set(Object.values(POR_SIGLA).map((n) => n.toLowerCase()));

/**
 * Convierte el código escrito en el papel al diagnóstico completo.
 *
 * Acepta "C/C", "c/c", "CC" y "C.C.", que es como aparece según quién escriba.
 * Lo que no reconoce lo devuelve tal cual: puede ser una anotación válida que
 * todavía no está en la lista.
 */
export function normalizarDiagnostico(valor: string | null): string | null {
  const texto = valor?.trim();
  if (!texto) return null;

  const comoNombre = texto.toLowerCase().replace(/\s+/g, " ");
  if (NOMBRES.has(comoNombre)) {
    return DIAGNOSTICOS.find((d) => d.nombre.toLowerCase() === comoNombre)!.nombre;
  }

  const sigla = texto.toLowerCase().replace(/[\s./-]/g, "");
  return POR_SIGLA[sigla] ?? texto;
}
