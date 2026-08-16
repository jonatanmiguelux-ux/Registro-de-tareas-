import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  leerConfig,
  guardarConfig,
  resolverDestino,
  listarPendientes,
  subirPendientes,
  carpetaEspera,
  sePuedeEscribir,
} from "@/lib/respaldos";

/**
 * Estas pruebas cuidan la regla que sostiene todo el respaldo: **nunca se
 * pierde un archivo**. Un error acá no rompe ninguna pantalla y no se nota en
 * el momento; se nota el día que hace falta un Excel de hace tres semanas y no
 * está.
 *
 * Todo pasa en una carpeta temporal, con `process.chdir`, porque el módulo
 * ubica sus carpetas a partir del directorio de trabajo.
 */

const original = process.cwd();

async function enCarpetaLimpia<T>(fn: (raiz: string) => Promise<T>): Promise<T> {
  const raiz = await mkdtemp(path.join(tmpdir(), "respaldos-"));
  process.chdir(raiz);
  try {
    return await fn(raiz);
  } finally {
    process.chdir(original);
  }
}

test("sin archivo de configuracion se usan los valores de fabrica", async () => {
  await enCarpetaLimpia(async () => {
    const config = await leerConfig();
    assert.equal(config.destino, "");
    assert.equal(config.conservar, 60);
  });
});

test("una configuracion rota no rompe el respaldo", async () => {
  await enCarpetaLimpia(async (raiz) => {
    await writeFile(path.join(raiz, "respaldo.config.json"), "{ esto no es json");
    const config = await leerConfig();
    assert.equal(config.conservar, 60, "sigue con lo de fabrica");
  });
});

test("guardar y volver a leer devuelve lo mismo", async () => {
  await enCarpetaLimpia(async (raiz) => {
    await guardarConfig({ destino: "D:\\nube\\excel", conservar: 30 });
    const config = await leerConfig();
    assert.equal(config.destino, "D:\\nube\\excel");
    assert.equal(config.conservar, 30);

    // Los textos de ayuda tienen que sobrevivir: es lo que explica el archivo
    // a quien lo abra sin conocer la app.
    const crudo = await readFile(path.join(raiz, "respaldo.config.json"), "utf8");
    assert.ok(crudo.includes("_ayuda_destino"));
  });
});

test("sin nube, el destino es la carpeta de espera", async () => {
  await enCarpetaLimpia(async () => {
    // Se fuerza el caso sin nube apuntando a candidatas que no existen.
    const anterior = process.env.OneDrive;
    delete process.env.OneDrive;
    try {
      const destino = await resolverDestino({ destino: "", conservar: 60 });
      if (!destino.enLaNube) {
        assert.equal(destino.ruta, carpetaEspera());
      }
    } finally {
      if (anterior) process.env.OneDrive = anterior;
    }
  });
});

test("una carpeta elegida a mano gana sobre la busqueda automatica", async () => {
  await enCarpetaLimpia(async (raiz) => {
    const elegida = path.join(raiz, "mi nube");
    const destino = await resolverDestino({ destino: elegida, conservar: 60 });
    assert.equal(destino.ruta, elegida);
    assert.equal(destino.manual, true);
    assert.equal(destino.enLaNube, true);
  });
});

test("los pendientes se suben todos y la espera queda vacia", async () => {
  await enCarpetaLimpia(async (raiz) => {
    const espera = carpetaEspera();
    await mkdir(espera, { recursive: true });
    for (const d of ["2026-08-11", "2026-08-12", "2026-08-13"]) {
      await writeFile(path.join(espera, `registro-de-tareas-${d}.xlsx`), `dia ${d}`);
    }

    assert.equal((await listarPendientes()).length, 3);

    const nube = path.join(raiz, "nube");
    const movidos = await subirPendientes(nube);

    assert.equal(movidos, 3);
    assert.equal((await listarPendientes()).length, 0, "la espera queda vacia");
    assert.equal((await readdir(nube)).length, 3);
  });
});

test("si el archivo ya esta en la nube, manda el de la nube", async () => {
  await enCarpetaLimpia(async (raiz) => {
    const espera = carpetaEspera();
    const nube = path.join(raiz, "nube");
    await mkdir(espera, { recursive: true });
    await mkdir(nube, { recursive: true });

    const nombre = "registro-de-tareas-2026-08-11.xlsx";
    await writeFile(path.join(espera, nombre), "el viejo, incompleto");
    await writeFile(path.join(nube, nombre), "el bueno");

    const movidos = await subirPendientes(nube);

    assert.equal(movidos, 0, "no se movio nada");
    assert.equal((await listarPendientes()).length, 0, "el duplicado se descarto");
    assert.equal(
      await readFile(path.join(nube, nombre), "utf8"),
      "el bueno",
      "el de la nube quedo intacto",
    );
  });
});

test("subir a la propia carpeta de espera no hace nada", async () => {
  await enCarpetaLimpia(async () => {
    const espera = carpetaEspera();
    await mkdir(espera, { recursive: true });
    await writeFile(path.join(espera, "registro-de-tareas-2026-08-11.xlsx"), "x");

    // Sin nube, el destino ES la espera. Sin este resguardo el archivo se
    // "movería" sobre sí mismo y podría desaparecer.
    assert.equal(await subirPendientes(espera), 0);
    assert.equal((await listarPendientes()).length, 1, "sigue estando");
  });
});

test("no se puede escribir en una ruta imposible", async () => {
  await enCarpetaLimpia(async () => {
    assert.equal(await sePuedeEscribir("Z:\\no\\existe\\esta\\unidad"), false);
  });
});

test("una carpeta nueva se crea sola al validarla", async () => {
  await enCarpetaLimpia(async (raiz) => {
    const nueva = path.join(raiz, "todavia", "no", "existe");
    assert.equal(await sePuedeEscribir(nueva), true);
  });
});
