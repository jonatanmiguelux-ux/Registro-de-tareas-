import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { PlanillaIaSchema, type PlanillaIa } from "@/lib/schema";

const MODELO = process.env.ANTHROPIC_MODEL ?? "claude-opus-5";

/** Formatos de imagen que la API de visión acepta. */
export const TIPOS_IMAGEN_VALIDOS = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

export type TipoImagen = (typeof TIPOS_IMAGEN_VALIDOS)[number];

export function esTipoImagenValido(tipo: string): tipo is TipoImagen {
  return (TIPOS_IMAGEN_VALIDOS as readonly string[]).includes(tipo);
}

const client = new Anthropic();

const INSTRUCCIONES = `Sos un asistente que digitaliza planillas de mantenimiento de alumbrado público de un municipio, llenadas a mano.

Tu trabajo es transcribir lo que está escrito. No es interpretar, deducir ni completar.

## Cómo es la planilla

Arriba de todo hay una franja que se llena **una sola vez** y vale para toda la hoja:
**Fecha:** · **Oficial:** · **Chofer:** · **Móvil Nº:**

Debajo está la tabla. Cada fila escrita es un reclamo atendido. Sus primeras cinco columnas son de texto:

1. **Localidad**
2. **Tipo de reclamo**
3. **Fecha Ingreso**
4. **Nº Incidente**
5. **Dirección** — una sola celda ancha, con la calle y la altura juntas

A la derecha vienen las columnas de materiales, angostas y numerosas, agrupadas bajo tres títulos que abarcan varias columnas cada uno: **Lámparas**, **Balastos** y **Otros materiales**.

Dos cosas de la tabla que importan mucho:

- **Los encabezados de los materiales están impresos en vertical** (rotados 90°, se leen de abajo hacia arriba). Los títulos de grupo (Lámparas, Balastos, Otros materiales) sí están en horizontal, arriba, abarcando el bloque de columnas que les corresponde.
- **Lámparas, Balastos y Otros materiales NO son columnas de material.** Son títulos de grupo. Nunca los devuelvas como si fueran una columna marcable.

## Cómo leer

1. Empezá por la cabecera: pasá Fecha, Oficial, Chofer y Móvil Nº a \`encabezado\`.
2. Listá los encabezados de materiales en \`columnasMateriales\`, de izquierda a derecha, cada uno con el grupo que lo abarca.
3. Después recorré la tabla **fila por fila**. De cada fila leé primero las cinco columnas de texto y recién ahí pasá a la zona de materiales.
4. **La zona de materiales es donde más fácil se equivoca uno.** Son muchas columnas angostas y pegadas, así que no alcanza con mirar hacia arriba desde la marca: hay que contar. Para cada marca, contá cuántos casilleros hay entre el borde izquierdo de la zona de materiales y el casillero donde cae, y usá ese número para elegir la columna en la lista que armaste en el paso 2. Confirmá que el grupo cierre: una marca en el primer bloque tiene que caer en una lámpara, no en un balasto.
5. Una marca corrida, inclinada o que pisa la línea entre dos columnas es ambigua: elegí la columna cuyo casillero contiene la mayor parte del trazo y bajá la \`confianza\` de esa fila a "baja".
6. Si en la celda hay un número en vez de una X, ese número es la \`cantidad\`. Una X, cruz o tilde sola es cantidad 1.
7. En \`materiales\` de cada fila incluí **solamente las columnas marcadas**. Las celdas vacías no se listan.

## Reglas que no se negocian

- Si un dato no se lee o no está, poné \`null\`. Nunca lo inventes, ni lo deduzcas de otras filas, ni lo completes con un valor "razonable".
- **La cabecera no se repite en las filas.** Fecha, Oficial, Chofer y Móvil van en \`encabezado\` y quedan en \`null\` en cada reclamo. El sistema ya se encarga de bajarlos a las filas.
- **Separá "Dirección" en dos campos**: el nombre de la calle va en \`calle\` y la altura en \`numero\`. Si la celda no trae altura, \`numero\` va en \`null\`. Si trae una esquina o entrecalle en vez de altura ("Newbery y Costanera"), poné todo en \`calle\` y dejá \`numero\` en \`null\`.
- Transcribí los nombres propios y las calles como están escritos, aunque parezcan mal escritos.
- Las fechas van en formato AAAA-MM-DD. En el papel se escriben como DD/MM o DD/MM/AA. Si falta el año, usá el de la Fecha de la cabecera; si tampoco está, dejá \`null\`.
- La planilla no tiene columna de observaciones. Usá \`observaciones\` sólo si hay una anotación al margen que claramente pertenece a esa fila.
- Ignorá las filas en blanco: la planilla siempre tiene filas de sobra al final. No las devuelvas.
- Marcá \`confianza\` como "baja" en cualquier fila donde la letra sea dudosa o dudes de a qué columna corresponde una marca. Alguien va a revisar esas filas primero: es más útil una duda declarada que una certeza falsa.
- Usá \`notas\` para avisar de zonas borrosas, foto cortada o en ángulo, columnas que no pudiste identificar, o cualquier cosa que convenga que mire la persona que revisa.
- Si la foto es de una planilla **en blanco**, sin ninguna fila llena, devolvé \`reclamos\` vacío y decilo en \`notas\`.`;

export type ResultadoOcr = {
  datos: PlanillaIa;
  modelo: string;
};

/**
 * Manda la foto de la planilla al modelo de visión y devuelve los datos
 * ya validados contra el esquema.
 *
 * @param imagenBase64 La imagen codificada en base64, sin el prefijo data:.
 * @param tipo         El media type de la imagen.
 * @param columnasConocidas Columnas de materiales que ya están en el catálogo,
 *                          en el orden del papel. Se pasan como pista: fijan la
 *                          nomenclatura y le dan al modelo el orden esperado de
 *                          las columnas, que es lo que más ayuda a no correrse
 *                          al asociar una marca. No lo limitan.
 */
export async function analizarPlanilla(
  imagenBase64: string,
  tipo: TipoImagen,
  columnasConocidas: { nombre: string; grupo: string | null }[] = [],
): Promise<ResultadoOcr> {
  const pista =
    columnasConocidas.length > 0
      ? `\n\n## Columnas esperadas

Este municipio usa una planilla con estas columnas de materiales, en este orden de izquierda a derecha:

${columnasConocidas
  .map((c, i) => `${i + 1}. ${c.nombre}${c.grupo ? ` (${c.grupo})` : ""}`)
  .join("\n")}

Usá exactamente estos nombres para las columnas que reconozcas, así los datos se acumulan bien entre planillas. El orden te sirve para contar casilleros y ubicar cada marca.

Ahora bien: la lista es una referencia, no un molde. Si la foto muestra columnas distintas, adicionales o en otro orden, informá lo que **ves en la foto**, no lo que dice esta lista, y avisalo en \`notas\`.`
      : "";

  const respuesta = await client.messages.parse({
    model: MODELO,
    max_tokens: 16000,
    system: INSTRUCCIONES + pista,
    output_config: {
      format: zodOutputFormat(PlanillaIaSchema),
    },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: tipo, data: imagenBase64 },
          },
          {
            type: "text",
            text: "Digitalizá esta planilla. Devolvé una entrada por cada fila escrita, con las marcas de materiales asociadas a la fila y la columna que les corresponde.",
          },
        ],
      },
    ],
  });

  if (respuesta.stop_reason === "refusal") {
    throw new Error(
      "El modelo no procesó la imagen. Verificá que la foto sea de una planilla de trabajo.",
    );
  }

  if (respuesta.stop_reason === "max_tokens") {
    throw new Error(
      "La respuesta quedó cortada porque la planilla es muy larga. Probá sacando la foto en dos partes.",
    );
  }

  if (!respuesta.parsed_output) {
    throw new Error("El modelo no devolvió datos legibles de la planilla.");
  }

  return { datos: respuesta.parsed_output, modelo: MODELO };
}
