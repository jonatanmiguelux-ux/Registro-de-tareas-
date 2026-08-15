import test from "node:test";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";

import { contar, encolar, listar, vaciar } from "@/lib/cola";

/**
 * Lo que se prueba acá es la regla que evita cargar dos veces la misma
 * planilla: una foto sale de la cola cuando el servidor responde, sea lo que
 * sea que responda, y sólo se conserva si la petición nunca llegó.
 *
 * Es la parte donde un error no se ve: nadie nota una planilla duplicada
 * hasta que los números del tablero no cierran.
 */

function foto(nombre = "planilla.jpg"): File {
  return new File([new Uint8Array([1, 2, 3])], nombre, { type: "image/jpeg" });
}

/** Reemplaza `fetch` por uno que hace lo que diga `comportamiento`. */
function fingirFetch(comportamiento: () => Promise<Response>) {
  globalThis.fetch = comportamiento as typeof fetch;
}

function respuesta(estado: number, cuerpo: unknown): Promise<Response> {
  return Promise.resolve(
    new Response(JSON.stringify(cuerpo), {
      status: estado,
      headers: { "content-type": "application/json" },
    }),
  );
}

async function vaciarCola() {
  fingirFetch(() => respuesta(201, { id: "limpieza" }));
  await vaciar();
  assert.equal(await contar(), 0, "la cola tendría que haber quedado vacía");
}

test("guarda la foto cuando no hay red y la conserva para después", async () => {
  await vaciarCola();
  await encolar(foto("sin-senal.jpg"));

  fingirFetch(() => Promise.reject(new TypeError("Failed to fetch")));
  const resultados = await vaciar();

  assert.deepEqual(resultados, [{ estado: "sin-red" }]);
  assert.equal(await contar(), 1, "la foto no se puede perder");

  const [pendiente] = await listar();
  assert.equal(pendiente.intentos, 1, "tendría que registrar el intento");
  assert.equal(pendiente.nombre, "sin-senal.jpg");
});

test("la sube y la saca de la cola cuando vuelve la conexión", async () => {
  await vaciarCola();
  await encolar(foto("vuelve-la-senal.jpg"));

  fingirFetch(() => respuesta(201, { id: "planilla-abc" }));
  const resultados = await vaciar();

  assert.deepEqual(resultados, [
    {
      estado: "subida",
      planillaId: "planilla-abc",
      nombre: "vuelve-la-senal.jpg",
    },
  ]);
  assert.equal(await contar(), 0);
});

test("NO reintenta cuando el servidor responde con error: ya guardó la planilla", async () => {
  await vaciarCola();
  await encolar(foto("modelo-caido.jpg"));

  // 502 es el caso real: la planilla ya quedó creada en estado ERROR antes de
  // que fallara la lectura. Reintentarla crearía una segunda para la misma
  // foto, y el consumo de materiales se contaría dos veces.
  fingirFetch(() =>
    respuesta(502, { id: "ya-existe", error: "El servicio no responde." }),
  );
  const resultados = await vaciar();

  assert.deepEqual(resultados, [
    {
      estado: "rechazada",
      nombre: "modelo-caido.jpg",
      motivo: "El servicio no responde.",
    },
  ]);
  assert.equal(await contar(), 0, "no puede quedar para reintentar");
});

test("conserva la foto si venció la sesión: se rechazó antes de crear nada", async () => {
  await vaciarCola();
  await encolar(foto("sesion-vencida.jpg"));

  // 401 y 403 son la excepción a la regla de "cualquier respuesta la saca de
  // la cola": el servidor corta antes de crear la planilla, así que no hay
  // nada a medio hacer y reintentar no duplica. Descartarla acá sería perder
  // la foto por haber tardado en volver a tener señal.
  fingirFetch(() => respuesta(401, { error: "Hay que iniciar sesión." }));
  const resultados = await vaciar();

  assert.deepEqual(resultados, [
    { estado: "sin-sesion", motivo: "Hay que iniciar sesión." },
  ]);
  assert.equal(await contar(), 1, "la foto no se puede perder");
});

test("conserva la foto si la cuenta todavía no está habilitada", async () => {
  await vaciarCola();
  await encolar(foto("cuenta-pendiente.jpg"));

  fingirFetch(() =>
    respuesta(403, { error: "Tu cuenta todavía no está habilitada." }),
  );
  const resultados = await vaciar();

  assert.equal(resultados[0].estado, "sin-sesion");
  assert.equal(
    await contar(),
    1,
    "se sube sola cuando un administrador la habilite",
  );
});

test("descarta lo que el servidor rechaza por formato", async () => {
  await vaciarCola();
  await encolar(foto("captura.gif"));

  fingirFetch(() => respuesta(415, { error: "Formato no soportado (gif)." }));
  const resultados = await vaciar();

  assert.equal(resultados[0].estado, "rechazada");
  assert.equal(await contar(), 0, "reintentar un GIF no lo va a hacer válido");
});

test("sube en orden y frena al quedarse sin red, sin perder las que faltan", async () => {
  await vaciarCola();
  await encolar(foto("primera.jpg"));
  await encolar(foto("segunda.jpg"));
  await encolar(foto("tercera.jpg"));

  let llamadas = 0;
  fingirFetch(() => {
    llamadas++;
    // La primera entra; en la segunda se corta la señal.
    return llamadas === 1
      ? respuesta(201, { id: "primera-id" })
      : Promise.reject(new TypeError("Failed to fetch"));
  });

  const resultados = await vaciar();

  assert.equal(resultados.length, 2, "tendría que cortar al primer sin-red");
  assert.equal(resultados[0].estado, "subida");
  assert.equal(resultados[1].estado, "sin-red");
  assert.equal(llamadas, 2, "no debería seguir intentando sin señal");
  assert.equal(await contar(), 2, "las dos que faltan siguen guardadas");

  const restantes = await listar();
  assert.deepEqual(
    restantes.map((r) => r.nombre),
    ["segunda.jpg", "tercera.jpg"],
    "se respeta el orden en que se sacaron las fotos",
  );
});
