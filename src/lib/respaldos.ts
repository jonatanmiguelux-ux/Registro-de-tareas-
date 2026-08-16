import { readFile, writeFile, mkdir, readdir, rename, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { access, copyFile, unlink } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

/**
 * Dónde se guarda el Excel de cada día, y qué hacer cuando no hay dónde.
 *
 * El respaldo corre solo, de lunes a viernes a las 12, en la PC donde vive la
 * app. Este archivo es lo que comparten la pantalla de configuración y el
 * script que corre a esa hora, para que los dos entiendan lo mismo por
 * "destino".
 *
 * **La regla que manda: nunca se pierde un archivo.** Si no hay una carpeta de
 * nube configurada, el Excel del día se guarda igual en una carpeta local de
 * espera. Cuando alguien configura una nube, lo que estaba esperando se sube
 * solo. Un respaldo que se saltea un día porque faltaba una configuración es
 * exactamente el respaldo que después no está cuando hace falta.
 */

export type ConfigRespaldo = {
  /** Carpeta de la nube. Vacío = buscarla sola. */
  destino: string;
  /** Cuántos archivos conservar antes de borrar los más viejos. */
  conservar: number;
};

export const CONFIG_POR_DEFECTO: ConfigRespaldo = {
  destino: "",
  conservar: 60,
};

/** Textos de ayuda que viajan dentro del propio archivo de configuración. */
const AYUDA = {
  _ayuda_destino:
    "Carpeta donde dejar el .xlsx de cada dia. Sirve cualquier nube que cree una carpeta en la PC: Google Drive, OneDrive, Dropbox, Mega. Si lo dejas vacio se busca solo. Se configura desde la pantalla Respaldos de la app.",
  _ayuda_conservar:
    "Cuantos archivos guardar antes de ir borrando los mas viejos. 60 son unos tres meses de dias habiles.",
};

function raiz(): string {
  return process.cwd();
}

export function rutaConfig(): string {
  return path.join(raiz(), "respaldo.config.json");
}

/** La carpeta de espera: donde aguardan los Excel mientras no hay nube. */
export function carpetaEspera(): string {
  return path.join(raiz(), "respaldos");
}

export async function leerConfig(): Promise<ConfigRespaldo> {
  try {
    const crudo = await readFile(rutaConfig(), "utf8");
    const datos = JSON.parse(crudo) as Partial<ConfigRespaldo>;
    return {
      destino: typeof datos.destino === "string" ? datos.destino.trim() : "",
      conservar:
        Number.isInteger(datos.conservar) && Number(datos.conservar) > 0
          ? Number(datos.conservar)
          : CONFIG_POR_DEFECTO.conservar,
    };
  } catch {
    // Sin archivo, o con el archivo roto, se sigue con lo de fábrica. Que no
    // se pueda leer una configuración no es motivo para dejar de respaldar.
    return { ...CONFIG_POR_DEFECTO };
  }
}

export async function guardarConfig(config: ConfigRespaldo): Promise<void> {
  const contenido = {
    _ayuda_destino: AYUDA._ayuda_destino,
    destino: config.destino,
    _ayuda_conservar: AYUDA._ayuda_conservar,
    conservar: config.conservar,
  };
  await writeFile(rutaConfig(), JSON.stringify(contenido, null, 2) + "\n", "utf8");
}

/**
 * Las carpetas donde las nubes más comunes se montan en Windows.
 *
 * El orden es el de preferencia. Tiene que coincidir con el del script de
 * PowerShell: si los dos buscaran distinto, la pantalla mostraría una carpeta
 * y el respaldo escribiría en otra.
 */
function candidatas(): string[] {
  const perfil = os.homedir();
  return [
    "G:\\Mi unidad",
    "G:\\My Drive",
    path.join(perfil, "Mi unidad"),
    path.join(perfil, "Google Drive"),
    process.env.OneDrive ?? "",
    path.join(perfil, "OneDrive"),
    path.join(perfil, "Dropbox"),
  ].filter(Boolean);
}

async function existe(ruta: string): Promise<boolean> {
  try {
    const s = await stat(ruta);
    return s.isDirectory();
  } catch {
    return false;
  }
}

export type Destino = {
  /** Carpeta donde va a quedar el Excel. Siempre hay una. */
  ruta: string;
  /** ¿Es una carpeta que sincroniza con una nube? */
  enLaNube: boolean;
  /** ¿La eligió una persona, o se encontró sola? */
  manual: boolean;
  /** Nombre para mostrar: "Google Drive", "OneDrive", "carpeta elegida". */
  nombre: string;
};

/** A dónde va a ir el Excel de hoy, con la configuración que hay ahora. */
export async function resolverDestino(
  config?: ConfigRespaldo,
): Promise<Destino> {
  const cfg = config ?? (await leerConfig());

  if (cfg.destino) {
    return {
      ruta: cfg.destino,
      enLaNube: true,
      manual: true,
      nombre: path.basename(cfg.destino) || cfg.destino,
    };
  }

  for (const c of candidatas()) {
    if (await existe(c)) {
      const nombre = c.includes("Drive") && !c.includes("OneDrive")
        ? "Google Drive"
        : c.includes("OneDrive")
          ? "OneDrive"
          : c.includes("Dropbox")
            ? "Dropbox"
            : path.basename(c);
      return {
        ruta: path.join(c, "Registro de tareas - Excel"),
        enLaNube: true,
        manual: false,
        nombre,
      };
    }
  }

  // No hay nube: a la carpeta de espera, que no es un fracaso sino el plan B.
  return {
    ruta: carpetaEspera(),
    enLaNube: false,
    manual: false,
    nombre: "carpeta de espera (sin nube)",
  };
}

/** ¿Se puede escribir ahí? Se comprueba antes de guardar una configuración. */
export async function sePuedeEscribir(ruta: string): Promise<boolean> {
  try {
    await mkdir(ruta, { recursive: true });
    await access(ruta, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/** Los Excel que están esperando que se configure una nube. */
export async function listarPendientes(): Promise<string[]> {
  try {
    const archivos = await readdir(carpetaEspera());
    return archivos.filter((a) => a.toLowerCase().endsWith(".xlsx")).sort();
  } catch {
    return [];
  }
}

/**
 * Manda a la nube todo lo que estaba esperando.
 *
 * Devuelve cuántos se movieron. Si el destino es la propia carpeta de espera
 * —porque sigue sin haber nube— no hace nada y devuelve 0.
 *
 * Si en el destino ya existe un archivo con ese nombre, el que estaba
 * esperando se descarta: son el mismo día, y el que ya está en la nube es el
 * bueno.
 */
export async function subirPendientes(destino: string): Promise<number> {
  const espera = carpetaEspera();
  if (path.resolve(destino) === path.resolve(espera)) return 0;

  const pendientes = await listarPendientes();
  if (pendientes.length === 0) return 0;

  await mkdir(destino, { recursive: true });

  let movidos = 0;
  for (const nombre of pendientes) {
    const origen = path.join(espera, nombre);
    const final = path.join(destino, nombre);

    if (await existe0(final)) {
      await unlink(origen);
      continue;
    }

    try {
      await rename(origen, final);
    } catch {
      // Entre discos distintos (C: y la unidad virtual de Drive) no se puede
      // renombrar: hay que copiar y recién después borrar el original. Nunca
      // al revés, para que un corte de luz en el medio no borre el único que
      // había.
      await copyFile(origen, final);
      await unlink(origen);
    }
    movidos++;
  }

  return movidos;
}

async function existe0(ruta: string): Promise<boolean> {
  try {
    await access(ruta, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/** Los Excel que ya están en la nube, del más nuevo al más viejo. */
export async function listarEnDestino(
  destino: string,
): Promise<{ nombre: string; bytes: number; fecha: Date }[]> {
  try {
    const archivos = await readdir(destino);
    const datos = await Promise.all(
      archivos
        .filter((a) => a.toLowerCase().endsWith(".xlsx"))
        .map(async (nombre) => {
          const s = await stat(path.join(destino, nombre));
          return { nombre, bytes: s.size, fecha: s.mtime };
        }),
    );
    return datos.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  } catch {
    return [];
  }
}
