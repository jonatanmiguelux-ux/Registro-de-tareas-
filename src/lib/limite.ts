/**
 * Límite de frecuencia: cuántas veces se puede hacer algo en un rato.
 *
 * Sin esto, cualquiera con una cuenta válida puede repetir una llamada miles
 * de veces. No hace falta mala intención: alcanza un botón que se queda
 * apretado o un celular que reintenta solo. Las dos puertas que importan son
 * la de cargar reclamos —fotos de hasta 20 MB que llenan el disco— y la de
 * subir planillas, que además **cuesta plata**, porque cada una es una
 * llamada a la IA.
 *
 * Se cuenta **por persona y no por dirección de IP**: las dos puertas exigen
 * sesión, y varias personas del municipio pueden compartir la misma conexión.
 * Castigar a la oficina entera porque uno se pasó sería peor que el problema.
 *
 * Vive en memoria, a propósito. Sumar una base de datos o un Redis para esto
 * agrega una pieza que se puede caer, y con eso se protege a una app que corre
 * en un solo servidor. Si algún día corre en varios, esto hay que rehacerlo:
 * cada uno llevaría su propia cuenta y el límite real sería el doble.
 */

/** Marcas de tiempo de los intentos recientes, por clave. */
const intentos = new Map<string, number[]>();

/** Cada tanto se limpian las claves viejas para que el mapa no crezca solo. */
let ultimaLimpieza = 0;
const CADA_LIMPIEZA = 5 * 60 * 1000;

export type Veredicto = {
  ok: boolean;
  /** Cuántos segundos faltan para poder reintentar. 0 si está permitido. */
  esperarSegundos: number;
};

/**
 * ¿Se permite este intento?
 *
 * Cuenta los de la ventana móvil anterior: no se reinicia "en hora en punto",
 * que dejaría pasar el doble justo en el cambio de hora.
 *
 * `ahora` se puede pasar para las pruebas; en producción no se toca.
 */
export function permitir(
  clave: string,
  maximo: number,
  ventanaMs: number,
  ahora: number = Date.now(),
): Veredicto {
  limpiarSiCorresponde(ahora, ventanaMs);

  const desde = ahora - ventanaMs;
  const previos = (intentos.get(clave) ?? []).filter((t) => t > desde);

  if (previos.length >= maximo) {
    // El más viejo de la ventana es el que va a salir primero: cuando caduque,
    // se libera un lugar.
    const masViejo = Math.min(...previos);
    const faltanMs = masViejo + ventanaMs - ahora;
    intentos.set(clave, previos);
    return { ok: false, esperarSegundos: Math.max(1, Math.ceil(faltanMs / 1000)) };
  }

  previos.push(ahora);
  intentos.set(clave, previos);
  return { ok: true, esperarSegundos: 0 };
}

function limpiarSiCorresponde(ahora: number, ventanaMs: number) {
  if (ahora - ultimaLimpieza < CADA_LIMPIEZA) return;
  ultimaLimpieza = ahora;

  const desde = ahora - ventanaMs;
  for (const [clave, marcas] of intentos) {
    const vivas = marcas.filter((t) => t > desde);
    if (vivas.length === 0) intentos.delete(clave);
    else intentos.set(clave, vivas);
  }
}

/** Sólo para las pruebas: deja el contador como recién arrancado. */
export function reiniciarLimites() {
  intentos.clear();
  ultimaLimpieza = 0;
}

/**
 * Los límites de cada puerta.
 *
 * Están holgados a propósito: tienen que frenar el abuso sin molestar nunca a
 * quien trabaja. Una cuadrilla que carga las planillas del día no llega a 40
 * en una hora, y un vecino no reporta 10 luminarias en sesenta minutos.
 */
export const LIMITES = {
  /** Reclamos de vecinos: por cuenta. */
  reclamoVecinal: { maximo: 10, ventanaMs: 60 * 60 * 1000 },
  /** Planillas: por cuenta. Cada una es una llamada paga a la IA. */
  planilla: { maximo: 40, ventanaMs: 60 * 60 * 1000 },
} as const;

/** El mensaje que ve la persona. Sin jerga y con el tiempo en criollo. */
export function mensajeDeEspera(segundos: number): string {
  if (segundos < 90) return `Esperá ${segundos} segundos y volvé a intentar.`;
  const minutos = Math.ceil(segundos / 60);
  return `Hiciste esto muchas veces seguidas. Volvé a intentar en ${minutos} minutos.`;
}
