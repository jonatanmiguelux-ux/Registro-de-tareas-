import { z } from "zod";

/**
 * Traduce un esquema de zod al subconjunto de JSON Schema que acepta Gemini.
 *
 * Existe para que el esquema siga viviendo en un solo lugar (`schema.ts`) y no
 * haya que mantener a mano una copia paralela que tarde o temprano se
 * desincroniza del `zod` con el que después se valida la respuesta.
 *
 * Dos diferencias con el JSON Schema que genera zod:
 *
 * - Un campo opcional en zod sale como `anyOf: [{tipo}, {type:"null"}]`.
 *   Gemini no soporta `anyOf` para esto: quiere el tipo suelto y
 *   `nullable: true`.
 * - `$schema` y `additionalProperties` no están en su vocabulario y hacen
 *   fallar la request.
 */
export function aEsquemaGemini(esquema: z.ZodType): Record<string, unknown> {
  return limpiar(
    z.toJSONSchema(esquema, { target: "draft-7" }) as Record<string, unknown>,
  );
}

const IGNORADAS = new Set(["$schema", "additionalProperties"]);

function limpiar(nodo: unknown): Record<string, unknown> {
  if (Array.isArray(nodo) || typeof nodo !== "object" || nodo === null) {
    return nodo as Record<string, unknown>;
  }

  const entrada = nodo as Record<string, unknown>;
  const salida: Record<string, unknown> = {};

  // El caso nullable: se colapsa la unión y se marca el campo.
  const variantes = entrada.anyOf ?? entrada.oneOf;
  if (Array.isArray(variantes)) {
    const noNulas = variantes.filter(
      (v) => (v as Record<string, unknown>)?.type !== "null",
    );
    const admiteNulo = noNulas.length < variantes.length;

    // Una unión real (dos tipos distintos, más allá del null) no tiene
    // traducción acá. Es preferible enterarse al arrancar que recibir un
    // error opaco de la API con cada planilla.
    if (noNulas.length !== 1) {
      throw new Error(
        `No se puede traducir a un esquema de Gemini una unión de ${noNulas.length} tipos.`,
      );
    }

    const base = limpiar(noNulas[0]);
    for (const [clave, valor] of Object.entries(entrada)) {
      if (clave === "anyOf" || clave === "oneOf" || IGNORADAS.has(clave)) continue;
      base[clave] = valor;
    }
    if (admiteNulo) base.nullable = true;
    return base;
  }

  for (const [clave, valor] of Object.entries(entrada)) {
    if (IGNORADAS.has(clave)) continue;

    if (clave === "properties" && valor && typeof valor === "object") {
      const propiedades: Record<string, unknown> = {};
      for (const [nombre, sub] of Object.entries(
        valor as Record<string, unknown>,
      )) {
        propiedades[nombre] = limpiar(sub);
      }
      salida.properties = propiedades;
      // Fija el orden en que Gemini emite los campos. Con la imagen delante,
      // que lea la fila antes que sus materiales mejora la asociación.
      salida.propertyOrdering = Object.keys(propiedades);
      continue;
    }

    if (clave === "items") {
      salida.items = limpiar(valor);
      continue;
    }

    salida[clave] = valor;
  }

  return salida;
}
