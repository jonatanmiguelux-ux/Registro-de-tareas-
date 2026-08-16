import test from "node:test";
import assert from "node:assert/strict";

import {
  esDiaHabil,
  inicioDeVentana,
  normalizarDireccion,
  normalizarAltura,
  claveDeLugar,
  esMismoLugar,
  avisoDeDuplicado,
} from "@/lib/duplicados-vecinales";

/**
 * Dos riesgos opuestos, y no son igual de graves.
 *
 * Si se **pasa de estricto**, rechaza el reclamo de una luminaria que de
 * verdad está rota: el vecino se queda sin poder avisar y la luz sigue
 * apagada. Si se **queda corto**, entra un duplicado y alguien tiene trabajo
 * de más. Ante la duda, siempre hacia el segundo lado.
 */

// Agosto de 2026: el 3 es lunes, el 8 sábado, el 9 domingo.
const LUNES = new Date(2026, 7, 3, 10, 0);
const MARTES = new Date(2026, 7, 4, 10, 0);
const MIERCOLES = new Date(2026, 7, 5, 10, 0);
const JUEVES = new Date(2026, 7, 6, 10, 0);
const VIERNES = new Date(2026, 7, 7, 10, 0);
const SABADO = new Date(2026, 7, 8, 10, 0);
const DOMINGO = new Date(2026, 7, 9, 10, 0);

test("sabado y domingo no son habiles", () => {
  assert.equal(esDiaHabil(SABADO), false);
  assert.equal(esDiaHabil(DOMINGO), false);
  for (const d of [LUNES, MARTES, MIERCOLES, JUEVES, VIERNES]) {
    assert.equal(esDiaHabil(d), true, d.toDateString());
  }
});

test("tres dias habiles hacia atras desde un jueves da el lunes", () => {
  const desde = inicioDeVentana(JUEVES);
  assert.equal(desde.getDate(), 3, "lunes 3");
});

test("el fin de semana no se cuenta: desde el martes se llega al jueves anterior", () => {
  // Martes 4 -> lunes 3 (1), viernes 31 de julio (2), jueves 30 (3).
  const desde = inicioDeVentana(MARTES);
  assert.equal(desde.getMonth(), 6, "julio");
  assert.equal(desde.getDate(), 30, "jueves 30 de julio");
});

test("desde un lunes se llega al miercoles anterior, salteando el finde", () => {
  // Lunes 3 -> viernes 31 (1), jueves 30 (2), miercoles 29 (3).
  const desde = inicioDeVentana(LUNES);
  assert.equal(desde.getDate(), 29);
});

test("la ventana conserva la hora del dia", () => {
  const desde = inicioDeVentana(new Date(2026, 7, 6, 15, 45));
  assert.equal(desde.getHours(), 15);
  assert.equal(desde.getMinutes(), 45);
});

test("la ventana siempre queda en el pasado", () => {
  for (const d of [LUNES, MARTES, MIERCOLES, JUEVES, VIERNES, SABADO, DOMINGO]) {
    assert.ok(inicioDeVentana(d) < d, d.toDateString());
  }
});

test("un reclamo del viernes sigue contando el lunes siguiente", () => {
  // Es el caso que motiva contar habiles: el viernes a la tarde y el lunes a
  // la manana son, en tiempo de trabajo, casi el mismo momento.
  const lunesSiguiente = new Date(2026, 7, 10, 9, 0);
  const viernes = new Date(2026, 7, 7, 17, 0);
  assert.ok(
    inicioDeVentana(lunesSiguiente) < viernes,
    "el viernes tiene que caer adentro de la ventana",
  );
});

test("la misma direccion escrita de varias formas es la misma", () => {
  const base = { localidad: "Mar de Ajó", calle: "Av. San Martín", numero: "1250" };
  const variantes = [
    { localidad: "mar de ajo", calle: "av san martin", numero: "1250" },
    { localidad: "MAR DE AJÓ", calle: "AV. SAN MARTIN", numero: "1250" },
    { localidad: "Mar de Ajo", calle: "Av  San  Martin ", numero: " 1250 " },
    { localidad: "Mar de Ajó", calle: "Av. San Martín", numero: "N° 1250" },
  ];
  for (const v of variantes) {
    assert.equal(esMismoLugar(base, v), true, JSON.stringify(v));
  }
});

test("direcciones distintas NO se confunden", () => {
  const base = { localidad: "Mar de Ajó", calle: "San Martín", numero: "1250" };
  const otras = [
    { localidad: "Costa Azul", calle: "San Martín", numero: "1250" },
    { localidad: "Mar de Ajó", calle: "Belgrano", numero: "1250" },
    { localidad: "Mar de Ajó", calle: "San Martín", numero: "1252" },
    { localidad: "Mar de Ajó", calle: "San Martín", numero: "125" },
  ];
  for (const o of otras) {
    assert.equal(esMismoLugar(base, o), false, JSON.stringify(o));
  }
});

test("no adivina abreviaturas: ante la duda deja pasar el reclamo", () => {
  // "Gral. Paz" y "General Paz" quedan como distintas a proposito. Rechazar
  // una luminaria rota de verdad es peor que aceptar un duplicado.
  assert.equal(
    esMismoLugar(
      { localidad: "Las Toninas", calle: "Gral Paz", numero: "100" },
      { localidad: "Las Toninas", calle: "General Paz", numero: "100" },
    ),
    false,
  );
});

test("la altura se compara por sus numeros", () => {
  assert.equal(normalizarAltura("1250"), "1250");
  assert.equal(normalizarAltura("1250 bis"), "1250");
  assert.equal(normalizarAltura("N° 1250"), "1250");
  assert.equal(normalizarAltura(" 1250 "), "1250");
});

test("una altura sin numeros no se pierde", () => {
  // "S/N" es real en las calles del partido: no puede colapsar a vacio, o
  // todas las esquinas sin numeracion serian la misma.
  assert.equal(normalizarAltura("S/N"), "s/n");
  assert.notEqual(normalizarAltura("S/N"), normalizarAltura("100"));
});

test("la clave es estable y distingue los tres campos", () => {
  const a = claveDeLugar("Mar de Ajó", "San Martín", "1250");
  assert.equal(a, claveDeLugar("mar de ajo", "san martin", "1250"));
  assert.notEqual(a, claveDeLugar("Mar de Ajó", "San Martín", "1251"));
  assert.equal(normalizarDireccion("  Dos   Espacios  "), "dos espacios");
});

test("el aviso nombra la cuadrilla y no revela nada del otro vecino", () => {
  const aviso = avisoDeDuplicado(3);
  assert.match(aviso, /ya fue realizado por un vecino/);
  assert.match(aviso, /cuadrilla 3/);
  // Ni codigo de seguimiento, ni direccion, ni datos de quien reporto.
  assert.doesNotMatch(aviso, /\b[A-Z0-9]{4}-[A-Z0-9]{4}\b/);
  assert.doesNotMatch(aviso, /@/);
});

test("si no hay cuadrilla, el aviso no miente", () => {
  const aviso = avisoDeDuplicado(null);
  assert.doesNotMatch(aviso, /cuadrilla \d/);
  assert.match(aviso, /ya fue realizado por un vecino/);
});
