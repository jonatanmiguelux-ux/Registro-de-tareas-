import { z } from "zod";

/**
 * Forma de los datos que la IA debe devolver al leer una planilla.
 *
 * Todo campo que la IA no logre leer va en `null` en vez de inventarse:
 * es preferible un hueco que una persona completa a un dato falso que
 * nadie revisa.
 */

export const MarcaMaterialSchema = z.object({
  nombre: z
    .string()
    .describe(
      "Nombre exacto de la columna de materiales, tal como figura en el encabezado de la planilla.",
    ),
  cantidad: z
    .number()
    .nullable()
    .describe(
      "Cantidad escrita en la celda. Si sólo hay una X, tilde o cruz sin número, usar 1.",
    ),
});

export const ReclamoIaSchema = z.object({
  fecha: z
    .string()
    .nullable()
    .describe(
      "Fecha de la fila en formato AAAA-MM-DD. La planilla no tiene columna de fecha: dejar null salvo que la fila traiga una fecha escrita aparte.",
    ),
  oficial: z
    .string()
    .nullable()
    .describe("Sólo si la fila trae un oficial propio. Normalmente null."),
  chofer: z
    .string()
    .nullable()
    .describe("Sólo si la fila trae un chofer propio. Normalmente null."),
  movil: z
    .string()
    .nullable()
    .describe("Sólo si la fila trae un móvil propio. Normalmente null."),
  localidad: z
    .string()
    .nullable()
    .describe(
      "Columna 'Localidad'. Se escribe con sigla (ST, MdA, AV…): transcribir la sigla tal cual, sin expandirla.",
    ),
  tipoReclamo: z
    .string()
    .nullable()
    .describe(
      "Columna 'Tipo de reclamo'. Suele venir vacía: dejar null si no hay nada escrito.",
    ),
  fechaIngreso: z
    .string()
    .nullable()
    .describe("Columna 'Fecha Ingreso', en formato AAAA-MM-DD."),
  nroIncidente: z.string().nullable().describe("Columna 'Nº Incidente'."),
  calle: z
    .string()
    .nullable()
    .describe(
      "Nombre de la calle, sacado de la columna 'Dirección' y separado de la altura.",
    ),
  numero: z
    .string()
    .nullable()
    .describe(
      "Altura, sacada de la columna 'Dirección'. null si la celda no trae número.",
    ),
  diagnostico: z
    .string()
    .nullable()
    .describe(
      "Sigla de diagnóstico escrita en la zona de materiales: 'C/C', 'F/C' o 'F/N'. Transcribir la sigla tal cual. null si la fila no tiene ninguna.",
    ),
  observaciones: z
    .string()
    .nullable()
    .describe(
      "Frase escrita a mano que cruza la zona de materiales de esta fila ('Imposible acceso', 'Pertenece a telefonica'). No es una marca ni una sigla. null si no hay ninguna.",
    ),
  materiales: z
    .array(MarcaMaterialSchema)
    .describe(
      "Sólo las columnas de materiales que tengan una marca en ESTA fila. Las celdas vacías no se incluyen.",
    ),
  confianza: z
    .enum(["alta", "media", "baja"])
    .describe(
      "Duda propia al transcribir ESTA fila. 'alta' sólo si leíste cada carácter sin dudar; 'media' si algún carácter podría ser otro (típico en los dígitos del N.º de incidente y en las alturas); 'baja' si no podés leer parte de la fila o dudás de a qué columna va una marca.",
    ),
});

export const ColumnaMaterialSchema = z.object({
  nombre: z
    .string()
    .describe("El encabezado de la columna, tal cual está impreso."),
  grupo: z
    .string()
    .nullable()
    .describe(
      "El título que abarca a esta columna: 'Lámparas', 'Balastos' u 'Otros materiales'.",
    ),
});

export const PlanillaIaSchema = z.object({
  encabezado: z
    .object({
      fecha: z
        .string()
        .nullable()
        .describe("Campo 'Fecha:' de la cabecera, en formato AAAA-MM-DD."),
      oficial: z.string().nullable().describe("Campo 'Oficial:'."),
      chofer: z.string().nullable().describe("Campo 'Chofer:'."),
      movil: z.string().nullable().describe("Campo 'Móvil Nº:'."),
      localidad: z
        .string()
        .nullable()
        .describe(
          "La planilla no trae localidad en la cabecera: dejar null salvo que esté escrita arriba.",
        ),
    })
    .describe(
      "La franja de arriba de la planilla, que se llena una sola vez y vale para todas las filas.",
    ),
  columnasMateriales: z
    .array(ColumnaMaterialSchema)
    .describe(
      "Los encabezados de las columnas de materiales, en el orden exacto en que aparecen de izquierda a derecha.",
    ),
  reclamos: z
    .array(ReclamoIaSchema)
    .describe("Una entrada por cada fila escrita de la planilla, en orden."),
  notas: z
    .string()
    .nullable()
    .describe(
      "Advertencias para quien revise: zonas ilegibles, foto cortada, columnas ambiguas.",
    ),
});

export type ColumnaMaterialIa = z.infer<typeof ColumnaMaterialSchema>;
export type MarcaMaterialIa = z.infer<typeof MarcaMaterialSchema>;
export type ReclamoIa = z.infer<typeof ReclamoIaSchema>;
export type PlanillaIa = z.infer<typeof PlanillaIaSchema>;
