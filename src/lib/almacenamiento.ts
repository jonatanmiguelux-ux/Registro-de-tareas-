import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

const DIRECTORIO = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

const EXTENSIONES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

/** Guarda la foto original y devuelve la ruta relativa con la que se la recupera. */
export async function guardarImagen(
  bytes: Buffer,
  tipo: string,
): Promise<string> {
  await mkdir(DIRECTORIO, { recursive: true });
  const nombre = `${randomUUID()}.${EXTENSIONES[tipo] ?? "bin"}`;
  await writeFile(path.join(DIRECTORIO, nombre), bytes);
  return nombre;
}

export async function leerImagen(nombre: string): Promise<Buffer> {
  // El nombre viene de la base, pero lo normalizamos igual: nada fuera del
  // directorio de subidas debe ser accesible desde una ruta de la API.
  const seguro = path.basename(nombre);
  return readFile(path.join(DIRECTORIO, seguro));
}

export async function borrarImagen(nombre: string): Promise<void> {
  try {
    await unlink(path.join(DIRECTORIO, path.basename(nombre)));
  } catch {
    // Si el archivo ya no está, el borrado igual se considera cumplido.
  }
}
