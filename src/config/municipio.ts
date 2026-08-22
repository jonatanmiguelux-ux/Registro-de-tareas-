/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  CONFIGURACIÓN DEL MUNICIPIO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Este es el ÚNICO archivo que hay que tocar para poner la app a andar en otro
 * municipio. Todo lo que cambia de un partido a otro —cómo se llama, sus
 * localidades, sus cuadrillas y dónde queda en el mapa— vive acá y en ningún
 * otro lado.
 *
 * Para un municipio nuevo:
 *
 *   1. Copiar la app y su base de datos (cada municipio va separado, con su
 *      propio alojamiento: así los datos de uno nunca se cruzan con los de
 *      otro).
 *   2. Editar este archivo con los datos del partido nuevo.
 *   3. Listo. No hay que tocar ninguna otra parte del código.
 *
 * Lo que está más abajo son los valores de la Municipalidad de La Costa, que
 * sirven de ejemplo de cómo se completa cada cosa.
 */

/** Cómo se llama el municipio. Aparece en la página pública del vecino. */
export const NOMBRE_MUNICIPIO = "Municipalidad de La Costa";

/**
 * Un punto en el mapa dentro del partido: la latitud y la longitud.
 *
 * Sirve para calcular a qué hora sale y se oculta el sol, y así avisarle al
 * vecino que prenda el flash si está sacando la foto de noche. No hace falta
 * que sea exacto —con estar en el partido alcanza—, porque en pocos
 * kilómetros el horario del sol casi no cambia.
 *
 * Cómo conseguir estos números: entrá a Google Maps, tocá con el botón
 * derecho en cualquier punto del municipio y "¿Qué hay aquí?". Los dos números
 * que aparecen son la latitud y la longitud, en ese orden.
 */
export const COORDENADAS = { latitud: -36.54, longitud: -56.69 };

/**
 * Las localidades del partido, con la abreviatura que se usa en la planilla.
 *
 * En el papel, la columna "Localidad" nunca trae el nombre completo: se anota
 * la sigla ("MdA", "ST"). Acá se lista cada sigla con su nombre completo, y el
 * sistema hace la traducción solo.
 *
 * - La clave (izquierda) es la sigla, en minúscula y sin puntos.
 * - El valor (derecha) es el nombre completo, tal como querés que se vea en
 *   las pantallas y en el Excel.
 *
 * El orden importa: es el orden en que salen las localidades en el Excel y en
 * los listados. Poné primero las que el municipio nombra primero.
 */
export const LOCALIDADES_POR_SIGLA: Record<string, string> = {
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

/**
 * El reparto con el que arranca el sistema: qué localidades cubre cada
 * cuadrilla.
 *
 * Es sólo el punto de partida. Una vez que la app está andando, el reparto se
 * cambia desde la pantalla "Cuadrillas y zonas" sin tocar el código; esto es
 * lo que se carga la primera vez, hasta que alguien lo ajuste.
 *
 * Cada nombre de localidad tiene que estar **escrito igual** que en la lista
 * de arriba (el nombre completo, no la sigla). Una localidad que no figure en
 * ninguna cuadrilla no se pierde: sus reclamos quedan a la vista en la
 * bandeja, esperando que alguien la asigne.
 */
export const REPARTO_INICIAL_CUADRILLAS: {
  numero: number;
  localidades: string[];
}[] = [
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
 * Los móviles (camiones) que tienen stock propio de materiales.
 *
 * Cada móvil lleva su propio stock: el pañol le entrega material y las
 * planillas que carga ese móvil se lo van descontando. Acá van los números
 * tal como se escriben en la planilla (la columna "Móvil Nº").
 *
 * Para agregar o sacar un móvil, editá esta lista. El resto del sistema —las
 * pantallas de stock por móvil y la entrega desde el pañol— se acomoda solo.
 */
export const MOVILES: number[] = [1, 5, 6, 8];
