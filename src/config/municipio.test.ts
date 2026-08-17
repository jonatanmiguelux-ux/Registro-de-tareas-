import test from "node:test";
import assert from "node:assert/strict";

import {
  NOMBRE_MUNICIPIO,
  COORDENADAS,
  LOCALIDADES_POR_SIGLA,
  REPARTO_INICIAL_CUADRILLAS,
} from "@/config/municipio";

/**
 * Estas pruebas cuidan el archivo que se edita a mano al poner la app en otro
 * municipio. No verifican los valores de La Costa —esos cambian— sino que la
 * configuración sea **coherente consigo misma**. El error típico al copiarla
 * para otro partido es de dedo: una localidad escrita distinto en el reparto y
 * en la lista, y esa localidad queda sin cuadrilla sin que nadie lo note.
 */

test("el municipio tiene nombre", () => {
  assert.equal(typeof NOMBRE_MUNICIPIO, "string");
  assert.ok(NOMBRE_MUNICIPIO.trim().length > 0);
});

test("las coordenadas son un punto válido del planeta", () => {
  assert.ok(COORDENADAS.latitud >= -90 && COORDENADAS.latitud <= 90);
  assert.ok(COORDENADAS.longitud >= -180 && COORDENADAS.longitud <= 180);
});

test("hay al menos una localidad", () => {
  assert.ok(Object.keys(LOCALIDADES_POR_SIGLA).length > 0);
});

test("las siglas están en minúscula y sin espacios", () => {
  // Si una sigla llevara mayúsculas o espacios, la normalización no la
  // encontraría y esa localidad no se reconocería nunca desde el papel.
  for (const sigla of Object.keys(LOCALIDADES_POR_SIGLA)) {
    assert.equal(sigla, sigla.toLowerCase().trim(), `sigla mal escrita: "${sigla}"`);
    assert.doesNotMatch(sigla, /\s/, `la sigla "${sigla}" tiene espacios`);
  }
});

test("no hay dos localidades con el mismo nombre", () => {
  const nombres = Object.values(LOCALIDADES_POR_SIGLA);
  assert.equal(
    new Set(nombres).size,
    nombres.length,
    "hay un nombre de localidad repetido",
  );
});

test("los números de cuadrilla son enteros positivos y no se repiten", () => {
  const numeros = REPARTO_INICIAL_CUADRILLAS.map((c) => c.numero);
  for (const n of numeros) {
    assert.ok(Number.isInteger(n) && n > 0, `número de cuadrilla inválido: ${n}`);
  }
  assert.equal(new Set(numeros).size, numeros.length, "hay una cuadrilla repetida");
});

/**
 * La comprobación que de verdad importa: cada localidad nombrada en el reparto
 * de cuadrillas tiene que existir, escrita exactamente igual, en la lista de
 * localidades. Es el error que rompe silenciosamente al copiar la app.
 */
test("toda localidad del reparto existe en la lista", () => {
  const conocidas = new Set(Object.values(LOCALIDADES_POR_SIGLA));
  const invitadas = REPARTO_INICIAL_CUADRILLAS.flatMap((c) => c.localidades);
  for (const l of invitadas) {
    assert.ok(
      conocidas.has(l),
      `la cuadrilla cubre "${l}", que no está en la lista de localidades (¿tilde o mayúscula distinta?)`,
    );
  }
});

test("una localidad no está en dos cuadrillas a la vez", () => {
  // Estaría mandando dos equipos al mismo poste.
  const todas = REPARTO_INICIAL_CUADRILLAS.flatMap((c) => c.localidades);
  assert.equal(new Set(todas).size, todas.length, "una localidad está repartida dos veces");
});
