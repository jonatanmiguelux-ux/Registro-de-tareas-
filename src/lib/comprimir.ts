/**
 * Achica la foto en el celular, antes de mandarla.
 *
 * Un teléfono de hoy saca fotos de 12 megapíxeles: entre 4 y 20 MB. Subir eso
 * tal cual tiene dos costos, y el segundo es el que duele.
 *
 * El primero es el disco del servidor: 5 GB se llenan con unos 1.250
 * reclamos, y el día que se llena deja de entrar cualquiera nuevo.
 *
 * El segundo es la persona. El vecino está parado en la vereda, de noche, con
 * una raya de señal. Subir 8 MB por ahí puede tardar minutos y cortarse a la
 * mitad. Achicar la foto es, sobre todo, que el reclamo llegue.
 *
 * **El límite lo pone lo que se necesita leer**, y por eso hay dos medidas:
 * la planilla la tiene que leer una IA letra por letra, y la luminaria sólo
 * tiene que verse.
 */

export type Medidas = {
  /** Lado más largo, en píxeles. */
  lado: number;
  /** Calidad del JPEG, de 0 a 1. */
  calidad: number;
};

/**
 * Planillas manuscritas: se cuida la legibilidad por encima del tamaño.
 *
 * 2400 píxeles en el lado largo dejan una hoja A4 con más de 200 puntos por
 * pulgada, de sobra para leer números escritos a mano. La calidad es alta a
 * propósito: los artefactos del JPEG se comen justamente los trazos finos, y
 * un "3" que se lee como "8" es peor que un archivo grande.
 */
export const PLANILLA: Medidas = { lado: 2400, calidad: 0.9 };

/**
 * Fotos de luminarias: sólo tienen que mostrar cuál es y cómo está.
 *
 * Nadie va a leer nada en ellas, así que se puede achicar mucho más. 1600
 * píxeles es más que suficiente para reconocer una columna y su entorno.
 */
export const LUMINARIA: Medidas = { lado: 1600, calidad: 0.82 };

/** Por debajo de esto no vale la pena tocar nada. */
const MINIMO_PARA_TOCAR = 400 * 1024;

/**
 * Devuelve la foto achicada, o **la original** si algo no salió bien.
 *
 * Nunca falla hacia adelante: si el navegador no puede decodificar el
 * archivo, si el resultado sale más grande que el original o si el formato es
 * uno que no sabe abrir, se manda lo que la persona eligió. Perder el reclamo
 * por no haber podido comprimirlo sería el peor resultado posible.
 */
export async function comprimirImagen(
  archivo: File,
  medidas: Medidas,
): Promise<File> {
  // Un archivo ya chico no gana nada, y recomprimir un JPEG siempre pierde
  // un poco de calidad.
  if (archivo.size <= MINIMO_PARA_TOCAR) return archivo;

  try {
    const mapa = await aLienzo(archivo, medidas.lado);
    if (!mapa) return archivo;

    const blob = await aBlob(mapa, medidas.calidad);
    if (!blob) return archivo;

    // Puede pasar con imágenes ya muy optimizadas, o con capturas de pantalla
    // en PNG de pocos colores que al pasar a JPEG engordan.
    if (blob.size >= archivo.size) return archivo;

    return new File([blob], nombreJpg(archivo.name), {
      type: "image/jpeg",
      lastModified: archivo.lastModified,
    });
  } catch {
    return archivo;
  }
}

/** Dibuja la imagen ya escalada. Devuelve null si no se pudo abrir. */
async function aLienzo(
  archivo: File,
  ladoMaximo: number,
): Promise<HTMLCanvasElement | null> {
  const imagen = await decodificar(archivo);
  if (!imagen) return null;

  const { width: ancho0, height: alto0 } = imagen;
  if (!ancho0 || !alto0) return null;

  // Nunca se agranda: una foto chica se manda como está.
  const escala = Math.min(1, ladoMaximo / Math.max(ancho0, alto0));
  const ancho = Math.max(1, Math.round(ancho0 * escala));
  const alto = Math.max(1, Math.round(alto0 * escala));

  const lienzo = document.createElement("canvas");
  lienzo.width = ancho;
  lienzo.height = alto;

  const ctx = lienzo.getContext("2d");
  if (!ctx) return null;

  // Fondo blanco: si el original tiene transparencia, el JPEG la rellena de
  // negro y una planilla escaneada en PNG saldría ilegible.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, ancho, alto);

  // Suavizado en alta: al achicar mucho, sin esto aparecen escalones que se
  // comen los trazos finos de la letra.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(imagen, 0, 0, ancho, alto);

  if ("close" in imagen) imagen.close();
  return lienzo;
}

/**
 * Abre el archivo respetando la orientación de la cámara.
 *
 * `imageOrientation: "from-image"` es lo que evita que una planilla sacada
 * apaisada llegue acostada. Sin eso, la IA recibiría la hoja rotada 90 grados
 * y no leería nada.
 */
async function decodificar(
  archivo: File,
): Promise<ImageBitmap | HTMLImageElement | null> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(archivo, {
        imageOrientation: "from-image",
      });
    } catch {
      // Sigue por el camino viejo: algunos navegadores no aceptan opciones.
    }
  }

  return new Promise((resolver) => {
    const url = URL.createObjectURL(archivo);
    const imagen = new Image();
    imagen.onload = () => {
      URL.revokeObjectURL(url);
      resolver(imagen);
    };
    imagen.onerror = () => {
      URL.revokeObjectURL(url);
      resolver(null);
    };
    imagen.src = url;
  });
}

function aBlob(
  lienzo: HTMLCanvasElement,
  calidad: number,
): Promise<Blob | null> {
  return new Promise((resolver) => {
    lienzo.toBlob((b) => resolver(b), "image/jpeg", calidad);
  });
}

/** El nombre pasa a .jpg, porque el contenido ahora lo es. */
export function nombreJpg(nombre: string): string {
  const limpio = nombre.replace(/\.[^.]+$/, "");
  return `${limpio || "foto"}.jpg`;
}

/** Para contarle a la persona lo que pasó, en unidades que entiende. */
export function describirAhorro(antes: number, despues: number): string | null {
  if (despues >= antes) return null;
  const porciento = Math.round((1 - despues / antes) * 100);
  if (porciento < 10) return null;
  return `${(antes / 1024 / 1024).toFixed(1)} MB → ${(despues / 1024 / 1024).toFixed(1)} MB`;
}
