import { GoogleGenAI, ApiError } from "@google/genai";
import { PlanillaIaSchema, type PlanillaIa } from "@/lib/schema";
import { aEsquemaGemini } from "@/lib/gemini-schema";
import { LOCALIDADES } from "@/lib/localidades";
import { DIAGNOSTICOS } from "@/lib/diagnosticos";

const MODELO = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";

/**
 * Formatos que acepta la API de visión de Gemini.
 *
 * A diferencia de otros modelos, acá HEIC entra directo: no hace falta que
 * quien usa un iPhone cambie el formato de cámara. GIF, en cambio, no está
 * soportado, pero nadie fotografía una planilla en GIF.
 */
export const TIPOS_IMAGEN_VALIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export type TipoImagen = (typeof TIPOS_IMAGEN_VALIDOS)[number];

export function esTipoImagenValido(tipo: string): tipo is TipoImagen {
  return (TIPOS_IMAGEN_VALIDOS as readonly string[]).includes(tipo);
}

let cliente: GoogleGenAI | null = null;

function obtenerCliente(): GoogleGenAI {
  if (cliente) return cliente;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Falta configurar GEMINI_API_KEY. Avisale a quien administra el sistema.",
    );
  }
  cliente = new GoogleGenAI({ apiKey });
  return cliente;
}

const SIGLAS_LOCALIDAD = LOCALIDADES.map((l) => `${l.sigla} = ${l.nombre}`).join(
  " · ",
);

const SIGLAS_DIAGNOSTICO = DIAGNOSTICOS.map(
  (d) => `**${d.sigla}** = ${d.nombre}`,
).join(" · ");

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

A la derecha vienen las columnas de materiales, angostas y numerosas, agrupadas bajo tres títulos que abarcan varias columnas cada uno: **Lámparas**, **Balastos** y **Otras materiales**.

Tres cosas de la tabla que importan mucho:

- **La foto puede venir rotada.** La planilla es apaisada y se fotografía con el celular en vertical, así que es habitual que la hoja aparezca de costado, con la cabecera contra el borde derecho o izquierdo y las filas corriendo de arriba hacia abajo. Antes de leer nada, ubicá la orientación real de la hoja y leela derecha. La cabecera (Fecha/Oficial/Chofer/Móvil) es la referencia: va arriba de la tabla.
- **Los encabezados de los materiales están impresos en vertical** (rotados 90° respecto de la hoja). Los títulos de grupo sí están en horizontal, arriba, abarcando el bloque de columnas que les corresponde.
- **Lámparas, Balastos y Otras materiales NO son columnas de material.** Son títulos de grupo. Nunca los devuelvas como si fueran una columna marcable.

## Qué puede haber escrito en la zona de materiales

No todo lo que aparece ahí es una marca de material. Hay cuatro cosas distintas y cada una va a un campo distinto:

1. **Una X, cruz, tilde o número** en un casillero → es una marca de material. Va en \`materiales\`. Si hay un número, ese número es la \`cantidad\`; una X sola es cantidad 1.
2. **"AD"** escrito a mano, normalmente al lado de la marca de una lámpara → es un **material**: el Adaptador. No tiene columna impresa propia. Va en \`materiales\` con el nombre \`Adaptador\` y cantidad 1 (o el número que lo acompañe). Ojo: "1 AD" son **dos** materiales, la lámpara de esa columna con cantidad 1 y el Adaptador.
3. **Una sigla de diagnóstico**: ${SIGLAS_DIAGNOSTICO}. Dice qué se encontró, no qué se gastó. Va en \`diagnostico\`, con la sigla tal cual. **Nunca** en \`materiales\`.
4. **Una frase escrita a mano que cruza varias columnas** ("Imposible acceso", "Pertenece a telefonica", "Realizado por el Movil 6", "Se quito agua de la tulipa") → va en \`observaciones\`, tal como está escrita. **Nunca** en \`materiales\`: no es una marca, aunque pise casilleros.

## Cómo leer

1. Ubicá la orientación de la hoja y ponela derecha.
2. Pasá Fecha, Oficial, Chofer y Móvil Nº de la cabecera a \`encabezado\`.
3. Listá los encabezados de materiales en \`columnasMateriales\`, de izquierda a derecha, cada uno con el grupo que lo abarca. Sólo los que están **impresos** en la hoja.
4. Después recorré la tabla **fila por fila**. De cada fila leé primero las cinco columnas de texto y recién ahí pasá a la zona de materiales.
5. **La zona de materiales es donde más fácil se equivoca uno.** Son muchas columnas angostas y pegadas, así que no alcanza con mirar hacia arriba desde la marca: hay que contar. Para cada marca, contá cuántos casilleros hay entre el borde izquierdo de la zona de materiales y el casillero donde cae, y usá ese número para elegir la columna en la lista que armaste en el paso 3. Confirmá que el grupo cierre: una marca en el primer bloque tiene que caer en una lámpara, no en un balasto.
6. Una marca corrida, inclinada o que pisa la línea entre dos columnas es ambigua: elegí la columna cuyo casillero contiene la mayor parte del trazo y bajá la \`confianza\` de esa fila a "baja".
7. En \`materiales\` de cada fila incluí **solamente las columnas marcadas**. Las celdas vacías no se listan.

## Cómo puntuar la confianza

Este campo es lo único que le dice a la persona que revisa por dónde empezar. Si marcás todo "alta", la revisión se vuelve leer las veinte filas de nuevo contra el papel, que es exactamente lo que el sistema viene a evitar. Es una estimación honesta de tu propia duda, no una nota de tu desempeño.

El criterio es **por carácter, no por impresión general**: si al menos un carácter de la fila lo elegiste entre dos opciones posibles, la fila ya no es "alta".

- **alta** — leíste cada carácter sin dudar. Si tuvieras que apostar dinero a la transcripción exacta de esta fila, apostarías.
- **media** — la fila se entiende, pero hay al menos un carácter que podría ser otro. Es el caso típico de los números largos manuscritos: un 3 que puede ser 8, un 5 que puede ser 6, un 1 que puede ser 7. También va acá una calle cuyo nombre no terminás de descifrar.
- **baja** — dudás de a qué columna corresponde una marca, o hay parte de la fila que directamente no podés leer, o la zona está borrosa o cortada.

Prestales atención especial a los **números de incidente** (ocho dígitos manuscritos seguidos, sin contexto que ayude a corregir una lectura mala) y a las **alturas de las calles**. Ahí es donde más se equivoca cualquiera, y donde un dígito cambiado convierte el dato en otro reclamo.

No hay una proporción esperada: si la planilla está escrita con letra clara, todas pueden ser "alta". Pero si dudaste, decilo.

## Reglas que no se negocian

- Si un dato no se lee o no está, poné \`null\`. Nunca lo inventes, ni lo deduzcas de otras filas, ni lo completes con un valor "razonable".
- **La cabecera no se repite en las filas.** Fecha, Oficial, Chofer y Móvil van en \`encabezado\` y quedan en \`null\` en cada reclamo. El sistema ya se encarga de bajarlos a las filas.
- **Localidad se escribe con sigla.** Transcribí la sigla tal cual la ves, sin expandirla: el sistema la traduce. Las que se usan son: ${SIGLAS_LOCALIDAD}.
- **La columna "Tipo de reclamo" casi siempre viene vacía.** Si no hay nada escrito, \`null\`. No la completes con el diagnóstico ni con el tipo de material.
- **Separá "Dirección" en dos campos**: el nombre de la calle va en \`calle\` y la altura en \`numero\`. Si la celda no trae altura, \`numero\` va en \`null\`. Si trae una esquina o entrecalle en vez de altura ("Newbery y Costanera"), poné todo en \`calle\` y dejá \`numero\` en \`null\`.
- Transcribí los nombres propios y las calles como están escritos, aunque parezcan mal escritos.
- Las fechas van en formato AAAA-MM-DD. En el papel se escriben como DD/MM o DD/MM/AA. Si falta el año, usá el de la Fecha de la cabecera; si tampoco está, dejá \`null\`.
- Ignorá las filas en blanco: la planilla siempre tiene filas de sobra al final. No las devuelvas.
- Puntuá \`confianza\` con el criterio de arriba, sin inflarla. Alguien va a revisar primero las filas que marques: es más útil una duda declarada que una certeza falsa.
- Usá \`notas\` para avisar de zonas borrosas, foto cortada o en ángulo, columnas que no pudiste identificar, o cualquier cosa que convenga que mire la persona que revisa.
- Si la foto es de una planilla **en blanco**, sin ninguna fila llena, devolvé \`reclamos\` vacío y decilo en \`notas\`.`;

export type ResultadoOcr = {
  datos: PlanillaIa;
  modelo: string;
};

/** Intentos totales, contando el primero. */
const INTENTOS = 3;

/**
 * Una falla que se arregla sola esperando: el modelo saturado (503) o el
 * límite de pedidos por minuto (429).
 *
 * Se distinguen de una clave inválida o una cuota diaria agotada, que no
 * cambian por más que se reintente.
 */
function esPasajero(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  if (error.status === 503) return true;
  if (error.status !== undefined && error.status >= 500) return true;
  if (error.status === 429) {
    // La cuota diaria en cero también llega como 429, pero esperar no la
    // devuelve: se reconoce porque el mensaje habla del límite del plan.
    return !/per\s*day|daily|limit:\s*0/i.test(error.message ?? "");
  }
  return false;
}

/** Cuánto esperar antes del intento número `intento` (1 = el segundo). */
function esperaMs(intento: number, error: unknown): number {
  // La API sugiere un tiempo en el detalle del error; si viene, se respeta.
  const sugerido = /retryDelay"?\s*:\s*"?(\d+)s/i.exec(
    error instanceof ApiError ? (error.message ?? "") : "",
  );
  if (sugerido) return Math.min(Number(sugerido[1]) * 1000, 30_000);
  return Math.min(4000 * 2 ** (intento - 1), 30_000);
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Traduce una falla de la lectura a algo que se pueda mostrar en pantalla.
 *
 * Los errores de la API vienen en inglés y hablan de claves, cuotas y saldo:
 * cosas que quien está en la calle con el papel no puede resolver ni le
 * significan nada. Acá se separan en dos: lo que puede arreglar quien carga
 * (sacar la foto de nuevo) y lo que tiene que escalar a quien administra.
 *
 * El texto original no se pierde: se guarda igual en `planilla.error`.
 */
export function mensajeDeError(error: unknown): string {
  if (error instanceof ApiError) {
    const detalle = `${error.message ?? ""}`.toLowerCase();

    // Ojo con el 400: Google responde "API key not valid" con código 400, no
    // con 401. Sin este caso, el problema más habitual de configuración cae
    // en el mensaje genérico y manda a buscar por el lado equivocado.
    if (
      error.status === 401 ||
      error.status === 403 ||
      detalle.includes("api key not valid") ||
      detalle.includes("api_key_invalid") ||
      detalle.includes("api key expired")
    ) {
      return "La app no pudo autenticarse con el servicio de lectura. Avisale a quien administra el sistema: hay que revisar la clave de la API.";
    }

    if (detalle.includes("quota") || detalle.includes("billing")) {
      return "El servicio de lectura llegó al límite de su plan. Avisale a quien administra el sistema.";
    }

    if (error.status === 429) {
      return "El servicio de lectura está recibiendo demasiadas planillas juntas. Esperá un momento y volvé a intentar.";
    }

    if (error.status !== undefined && error.status >= 500) {
      return "El servicio de lectura no está respondiendo en este momento. La foto quedó guardada: volvé a intentar en unos minutos.";
    }

    return "No se pudo leer la planilla. La foto quedó guardada: probá de nuevo y, si sigue fallando, avisale a quien administra el sistema.";
  }

  // Los errores que lanza analizarPlanilla ya están escritos para pantalla.
  if (error instanceof Error) return error.message;

  return "No se pudo leer la planilla. Probá sacando la foto de nuevo.";
}

/**
 * Manda la foto de la planilla al modelo de visión y devuelve los datos
 * ya validados contra el esquema.
 *
 * @param imagenBase64 La imagen codificada en base64, sin el prefijo data:.
 * @param tipo         El media type de la imagen.
 * @param columnasImpresas Columnas de materiales que ya están en el catálogo y
 *                         tienen columna impresa, en el orden del papel. Se
 *                         pasan como pista: fijan la nomenclatura y le dan al
 *                         modelo el orden esperado de las columnas, que es lo
 *                         que más ayuda a no correrse al asociar una marca. No
 *                         lo limitan.
 * @param materialesSueltos Materiales del catálogo que NO tienen columna
 *                          impresa y se anotan a mano (el Adaptador). Van
 *                          aparte para no correr la numeración de casilleros.
 */
export async function analizarPlanilla(
  imagenBase64: string,
  tipo: TipoImagen,
  columnasImpresas: { nombre: string; grupo: string | null }[] = [],
  materialesSueltos: { nombre: string }[] = [],
): Promise<ResultadoOcr> {
  const pista =
    columnasImpresas.length > 0
      ? `\n\n## Columnas esperadas

Este municipio usa una planilla con estas columnas de materiales impresas, en este orden de izquierda a derecha:

${columnasImpresas
  .map((c, i) => `${i + 1}. ${c.nombre}${c.grupo ? ` (${c.grupo})` : ""}`)
  .join("\n")}

Usá exactamente estos nombres para las columnas que reconozcas, así los datos se acumulan bien entre planillas. El orden te sirve para contar casilleros y ubicar cada marca.

Ahora bien: la lista es una referencia, no un molde. Si la foto muestra columnas distintas, adicionales o en otro orden, informá lo que **ves en la foto**, no lo que dice esta lista, y avisalo en \`notas\`.${
          materialesSueltos.length > 0
            ? `

Además hay materiales que **no tienen columna propia** y se escriben a mano dentro de la celda de otra columna: ${materialesSueltos
                .map((m) => m.nombre)
                .join(", ")}. No los cuentes al numerar casilleros, pero sí devolvelos en \`materiales\` cuando aparezcan.`
            : ""
        }`
      : "";

  const pedido = {
    model: MODELO,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: tipo, data: imagenBase64 } },
          {
            text: "Digitalizá esta planilla. Devolvé una entrada por cada fila escrita, con las marcas de materiales asociadas a la fila y la columna que les corresponde.",
          },
        ],
      },
    ],
    config: {
      systemInstruction: INSTRUCCIONES + pista,
      responseMimeType: "application/json",
      responseSchema: aEsquemaGemini(PlanillaIaSchema),
      maxOutputTokens: 32000,
      // La transcripción no es una tarea creativa: se quiere el mismo
      // resultado si se lee la misma foto dos veces.
      temperature: 0,
    },
  };

  // El modelo se satura seguido y devuelve 503 durante unos segundos. Quien
  // carga la planilla está en la calle con el papel en la mano: reintentar
  // acá le ahorra tener que entender el error y volver a sacar la foto.
  let respuesta;
  for (let intento = 1; ; intento++) {
    try {
      respuesta = await obtenerCliente().models.generateContent(pedido);
      break;
    } catch (error) {
      if (intento >= INTENTOS || !esPasajero(error)) throw error;
      await dormir(esperaMs(intento, error));
    }
  }

  const motivo = respuesta.candidates?.[0]?.finishReason;

  if (motivo === "MAX_TOKENS") {
    throw new Error(
      "La respuesta quedó cortada porque la planilla es muy larga. Probá sacando la foto en dos partes.",
    );
  }

  if (motivo === "SAFETY" || motivo === "PROHIBITED_CONTENT") {
    throw new Error(
      "El modelo no procesó la imagen. Verificá que la foto sea de una planilla de trabajo.",
    );
  }

  const texto = respuesta.text;
  if (!texto) {
    throw new Error("El modelo no devolvió datos legibles de la planilla.");
  }

  let crudo: unknown;
  try {
    crudo = JSON.parse(texto);
  } catch {
    throw new Error("El modelo devolvió una respuesta que no se pudo leer.");
  }

  // El esquema que se le manda a Gemini es una traducción del de zod, así que
  // la respuesta se valida igual contra el original: si la traducción perdió
  // algo por el camino, se nota acá y no tres pantallas más adelante.
  const validado = PlanillaIaSchema.safeParse(crudo);
  if (!validado.success) {
    throw new Error(
      "El modelo devolvió la planilla en un formato inesperado. Volvé a intentar.",
    );
  }

  return { datos: validado.data, modelo: MODELO };
}
