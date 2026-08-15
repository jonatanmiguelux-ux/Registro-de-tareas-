import { TIPOS_IMAGEN_VALIDOS, type TipoImagen } from "@/lib/ocr";

/**
 * Reconoce el formato de una imagen mirando sus primeros bytes.
 *
 * El navegador manda un `type` junto con el archivo, pero ese dato lo pone
 * quien sube: cualquiera puede mandar un archivo con contenido arbitrario
 * declarándolo `image/jpeg`. Confiar en él significa guardar en el servidor
 * —y reenviarle a un tercero— algo que nunca se comprobó que sea una foto.
 *
 * Los formatos se identifican por una firma fija al principio del archivo,
 * que sí forma parte del contenido y no se puede falsear sin dejar de ser
 * una imagen válida.
 */
export function detectarTipoImagen(bytes: Buffer): TipoImagen | null {
  if (bytes.length < 12) return null;

  // JPEG: siempre empieza con FF D8 FF.
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: firma de 8 bytes, pensada justamente para detectar corrupción.
  if (
    bytes[0] === 0x89 &&
    bytes.toString("ascii", 1, 4) === "PNG" &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  // WEBP: contenedor RIFF con la marca WEBP en el byte 8.
  if (
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }

  // HEIC/HEIF: contenedor ISO-BMFF. La caja "ftyp" arranca en el byte 4 y la
  // marca que sigue dice de qué variante se trata.
  if (bytes.toString("ascii", 4, 8) === "ftyp") {
    const marca = bytes.toString("ascii", 8, 12);
    if (["heic", "heix", "hevc", "hevx"].includes(marca)) return "image/heic";
    if (["mif1", "msf1", "heim", "heis"].includes(marca)) return "image/heif";
  }

  return null;
}

export type Verificacion =
  | { ok: true; tipo: TipoImagen }
  | { ok: false; motivo: string };

/**
 * Comprueba que lo subido sea realmente una de las imágenes que aceptamos.
 *
 * Devuelve el tipo detectado en el contenido, que es el que hay que usar de
 * ahí en adelante: guardarlo y mandárselo al modelo con el tipo declarado por
 * el navegador sería seguir confiando en el mismo dato que vinimos a
 * verificar.
 */
export function verificarImagen(
  bytes: Buffer,
  tipoDeclarado: string,
): Verificacion {
  const real = detectarTipoImagen(bytes);

  if (!real) {
    return {
      ok: false,
      motivo:
        "El archivo no es una imagen que podamos leer. Sacá la foto de nuevo o elegí otra.",
    };
  }

  if (!(TIPOS_IMAGEN_VALIDOS as readonly string[]).includes(real)) {
    return {
      ok: false,
      motivo: `Formato no soportado. Usá JPG, PNG, WEBP o HEIC.`,
    };
  }

  // Que no coincida con lo declarado no es motivo para rechazar: pasa solo,
  // sin mala intención, cuando el celular renombra o reetiqueta la foto. Se
  // sigue adelante con el tipo real, que es el que importa.
  return { ok: true, tipo: real };
}
