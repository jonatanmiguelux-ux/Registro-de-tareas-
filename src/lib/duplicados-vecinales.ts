/**
 * Que dos vecinos no reporten dos veces la misma luminaria.
 *
 * En una cuadra a oscuras avisa el primero que agarra el celular, y después
 * el de al lado. Sin esto, la cuadrilla recibe la misma esquina cuatro veces
 * y hay que depurar a mano; y el segundo vecino se queda sin saber si su
 * aviso sirvió de algo.
 *
 * **La ventana se reinicia a los 3 días hábiles.** No es un plazo caprichoso:
 * si pasada esa semana laboral corta la luz sigue sin andar, que se pueda
 * reportar de nuevo es justamente lo que queremos. El segundo aviso, esta vez,
 * significa "no lo arreglaron".
 *
 * Nada se borra nunca. "Reiniciarse" es la ventana de comparación, no el
 * historial: los reclamos viejos siguen todos ahí.
 */

/** ¿Es un día de trabajo? Sábado y domingo no cuentan. */
export function esDiaHabil(fecha: Date): boolean {
  const dia = fecha.getDay();
  return dia !== 0 && dia !== 6;
}

/**
 * Desde cuándo se compara: 3 días hábiles hacia atrás.
 *
 * Se cuentan días hábiles y no días corridos porque el que arregla la luz
 * trabaja de lunes a viernes. Un reclamo del viernes a la tarde y otro del
 * lunes a la mañana están, en tiempo de trabajo, casi pegados: contar corrido
 * los daría por separados y la cuadrilla iría dos veces.
 *
 * No contempla feriados. Hacerlo pediría mantener un calendario nacional y
 * provincial año a año, y lo peor que pasa sin eso es que un feriado suelto
 * corra la ventana un día: se acepta un duplicado de más, nunca uno de menos.
 */
export function inicioDeVentana(ahora: Date, diasHabiles = 3): Date {
  const desde = new Date(ahora);
  let contados = 0;
  while (contados < diasHabiles) {
    desde.setDate(desde.getDate() - 1);
    if (esDiaHabil(desde)) contados++;
  }
  return desde;
}

/**
 * Deja una dirección comparable.
 *
 * Sin tildes, sin mayúsculas, sin puntos y con un solo espacio, porque "Av.
 * San Martín" y "av san martin" son la misma esquina escrita por dos personas
 * distintas.
 *
 * Se queda **corta a propósito**: no intenta adivinar que "Gral. Paz" y
 * "General Paz" son lo mismo. Equivocarse de más significa rechazar el
 * reclamo de una luminaria que de verdad está rota, y eso es mucho peor que
 * dejar pasar un duplicado, que a lo sumo le da trabajo de más a alguien.
 */
export function normalizarDireccion(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** La altura, sólo con sus números: "1250", "1250 bis" y "N° 1250" son la misma. */
export function normalizarAltura(texto: string): string {
  const digitos = texto.replace(/\D/g, "");
  return digitos || normalizarDireccion(texto);
}

/**
 * La llave con la que dos reclamos se consideran el mismo lugar: localidad,
 * calle y altura.
 */
export function claveDeLugar(
  localidad: string,
  calle: string,
  numero: string,
): string {
  return [
    normalizarDireccion(localidad),
    normalizarDireccion(calle),
    normalizarAltura(numero),
  ].join("|");
}

/** ¿Estos dos reclamos son del mismo lugar? */
export function esMismoLugar(
  a: { localidad: string; calle: string; numero: string },
  b: { localidad: string; calle: string; numero: string },
): boolean {
  return (
    claveDeLugar(a.localidad, a.calle, a.numero) ===
    claveDeLugar(b.localidad, b.calle, b.numero)
  );
}

/** El aviso que ve el vecino cuando alguien ya reportó esa luminaria. */
export function avisoDeDuplicado(cuadrilla: number | null): string {
  const destino =
    cuadrilla === null
      ? "y está derivado al área que corresponde"
      : `y está derivado a la cuadrilla ${cuadrilla}`;
  return `Ese reclamo ya fue realizado por un vecino ${destino}. No hace falta que lo cargues de nuevo. Si dentro de unos días la luz sigue sin andar, volvé a reportarla: la vamos a tomar como un aviso nuevo.`;
}
