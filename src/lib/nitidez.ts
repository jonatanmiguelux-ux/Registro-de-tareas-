import * as SunCalc from "suncalc";
import { COORDENADAS } from "@/config/municipio";

/**
 * Mide si una foto salió movida, sin IA y sin mandarla a ningún lado.
 *
 * Se usa la varianza del laplaciano: se recorre la imagen comparando cada
 * píxel con sus vecinos, y se mide cuánto varían esas diferencias. Una foto
 * nítida tiene bordes marcados —variación alta—; una movida los tiene
 * desdibujados, y el número se desploma.
 *
 * Corre entero en el navegador sobre una copia reducida, así que no cuesta
 * nada ni sube la foto a ningún servicio.
 */

/** Ancho al que se reduce antes de medir. Suficiente y rápido. */
const ANCHO = 256;

/**
 * Debajo de este brillo promedio no se emite juicio.
 *
 * Es la salvaguarda que hace usable todo esto: una foto nocturna de una calle
 * oscura da varianza bajísima **aunque esté perfectamente nítida**, porque
 * casi no hay detalle que medir. Sin esta excepción, el aviso saltaría
 * justamente en el caso más común del servicio —una luminaria apagada de
 * noche— y sería un estorbo en vez de una ayuda.
 */
const BRILLO_MINIMO = 42;

/**
 * Por debajo de esto se considera movida.
 *
 * El valor es empírico y conservador: es preferible dejar pasar alguna foto
 * dudosa a molestar a quien sacó una buena. El aviso además nunca bloquea.
 */
const UMBRAL = 55;

export type Nitidez = {
  /** true si conviene sugerir que saque otra. */
  borrosa: boolean;
  /** Para poder afinar el umbral mirando casos reales. */
  medida: number;
  brillo: number;
};

export async function analizarNitidez(archivo: File): Promise<Nitidez | null> {
  try {
    const mapa = await cargar(archivo);
    if (!mapa) return null;

    const { datos, ancho, alto } = mapa;

    // A gris con los pesos de la percepción humana: el verde manda.
    const gris = new Float32Array(ancho * alto);
    let suma = 0;
    for (let i = 0, p = 0; i < datos.length; i += 4, p++) {
      const v = 0.299 * datos[i] + 0.587 * datos[i + 1] + 0.114 * datos[i + 2];
      gris[p] = v;
      suma += v;
    }

    const brillo = suma / gris.length;
    if (brillo < BRILLO_MINIMO) {
      // Demasiado oscura para juzgar. No se opina.
      return { borrosa: false, medida: -1, brillo };
    }

    // Laplaciano: cuánto se despega cada píxel del promedio de sus vecinos.
    let sumaL = 0;
    let sumaL2 = 0;
    let cuenta = 0;

    for (let y = 1; y < alto - 1; y++) {
      for (let x = 1; x < ancho - 1; x++) {
        const i = y * ancho + x;
        const l =
          4 * gris[i] -
          gris[i - 1] -
          gris[i + 1] -
          gris[i - ancho] -
          gris[i + ancho];
        sumaL += l;
        sumaL2 += l * l;
        cuenta++;
      }
    }

    if (cuenta === 0) return null;

    const media = sumaL / cuenta;
    const varianza = sumaL2 / cuenta - media * media;

    return { borrosa: varianza < UMBRAL, medida: varianza, brillo };
  } catch {
    // Que no se pueda medir no puede impedir cargar el reclamo.
    return null;
  }
}

type Mapa = { datos: Uint8ClampedArray; ancho: number; alto: number };

function cargar(archivo: File): Promise<Mapa | null> {
  return new Promise((resolver) => {
    const url = URL.createObjectURL(archivo);
    const imagen = new Image();

    imagen.onload = () => {
      URL.revokeObjectURL(url);
      const escala = ANCHO / imagen.width;
      const ancho = ANCHO;
      const alto = Math.max(1, Math.round(imagen.height * escala));

      const lienzo = document.createElement("canvas");
      lienzo.width = ancho;
      lienzo.height = alto;
      const ctx = lienzo.getContext("2d", { willReadFrequently: true });
      if (!ctx) return resolver(null);

      ctx.drawImage(imagen, 0, 0, ancho, alto);
      resolver({ datos: ctx.getImageData(0, 0, ancho, alto).data, ancho, alto });
    };

    imagen.onerror = () => {
      URL.revokeObjectURL(url);
      resolver(null);
    };

    imagen.src = url;
  });
}

/**
 * Un punto dentro del partido, para calcular el sol.
 *
 * Todas las localidades de un mismo municipio caen sobre la misma franja: el
 * sol sale y se oculta casi a la misma hora en todas. No vale la pena pedirle
 * la ubicación al vecino —un permiso más, y una razón más para abandonar— por
 * una precisión que nadie va a notar.
 *
 * Las coordenadas de cada municipio viven en `src/config/municipio.ts`.
 */
const PUNTO_DEL_PARTIDO = COORDENADAS;

/**
 * ¿Está oscuro para quien está mirando la pantalla?
 *
 * Se calcula con la salida y la puesta del sol del día, en vez de una hora
 * fija. En la costa el atardecer va de las 17:38 en junio a las 20:07 en
 * enero: una regla fija tipo "de 19 a 7" se equivoca medio año, y del lado
 * peor — en invierno dejaba sin aviso casi dos horas y media de oscuridad
 * real, justo cuando las noches son largas y más se reclama por luces
 * apagadas.
 *
 * El cálculo es local y no consulta ningún servicio: sale de la fecha y las
 * coordenadas, así que funciona sin señal y no agrega ninguna espera.
 */
export function esDeNoche(fecha = new Date()): boolean {
  const { sunrise, sunset } = SunCalc.getTimes(
    fecha,
    PUNTO_DEL_PARTIDO.latitud,
    PUNTO_DEL_PARTIDO.longitud,
  );

  // En latitudes altas puede no haber salida o puesta ese día; acá no pasa,
  // pero si el cálculo no diera un valor usable es preferible no mostrar el
  // aviso a mostrarlo a destiempo.
  if (
    !sunrise ||
    !sunset ||
    Number.isNaN(sunrise.getTime()) ||
    Number.isNaN(sunset.getTime())
  ) {
    return false;
  }

  return fecha < sunrise || fecha >= sunset;
}
