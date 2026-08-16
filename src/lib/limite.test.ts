import test from "node:test";
import assert from "node:assert/strict";

import {
  permitir,
  reiniciarLimites,
  mensajeDeEspera,
  LIMITES,
} from "@/lib/limite";

/**
 * El límite tiene que frenar el abuso **sin molestar nunca a quien trabaja**.
 * Un límite que se pasa de estricto es peor que no tenerlo: la cuadrilla se
 * queda sin poder cargar y nadie entiende por qué.
 */

test("deja pasar hasta el máximo y frena el siguiente", () => {
  reiniciarLimites();
  const ahora = 1_000_000;
  for (let i = 0; i < 3; i++) {
    assert.equal(permitir("uno", 3, 60_000, ahora).ok, true, `intento ${i + 1}`);
  }
  assert.equal(permitir("uno", 3, 60_000, ahora).ok, false, "el cuarto no");
});

test("cada persona tiene su propia cuenta", () => {
  reiniciarLimites();
  const ahora = 1_000_000;
  for (let i = 0; i < 3; i++) permitir("ana", 3, 60_000, ahora);

  assert.equal(permitir("ana", 3, 60_000, ahora).ok, false);
  assert.equal(
    permitir("beto", 3, 60_000, ahora).ok,
    true,
    "que se pase Ana no puede frenar a Beto",
  );
});

test("pasada la ventana se puede de nuevo", () => {
  reiniciarLimites();
  const ahora = 1_000_000;
  for (let i = 0; i < 3; i++) permitir("uno", 3, 60_000, ahora);
  assert.equal(permitir("uno", 3, 60_000, ahora).ok, false);

  assert.equal(
    permitir("uno", 3, 60_000, ahora + 60_001).ok,
    true,
    "un minuto y un milisegundo después",
  );
});

test("la ventana es movil: no se libera todo de golpe", () => {
  reiniciarLimites();
  const t0 = 1_000_000;
  // Tres intentos repartidos en el minuto.
  permitir("uno", 3, 60_000, t0);
  permitir("uno", 3, 60_000, t0 + 20_000);
  permitir("uno", 3, 60_000, t0 + 40_000);

  // Justo despues de que caduque el primero, se libera **un** lugar.
  assert.equal(permitir("uno", 3, 60_000, t0 + 60_001).ok, true);
  assert.equal(
    permitir("uno", 3, 60_000, t0 + 60_002).ok,
    false,
    "el segundo todavia no caduco",
  );
});

test("dice cuanto falta esperar, y nunca cero", () => {
  reiniciarLimites();
  const t0 = 1_000_000;
  permitir("uno", 1, 60_000, t0);

  const v = permitir("uno", 1, 60_000, t0 + 30_000);
  assert.equal(v.ok, false);
  assert.ok(v.esperarSegundos > 0, "siempre al menos un segundo");
  assert.ok(v.esperarSegundos <= 30, `esperaba <=30, fue ${v.esperarSegundos}`);
});

test("un intento rechazado no consume lugar", () => {
  reiniciarLimites();
  const t0 = 1_000_000;
  permitir("uno", 1, 60_000, t0);

  // Diez rechazos seguidos no pueden correr el reloj hacia adelante: si lo
  // hicieran, quien insiste quedaria castigado para siempre.
  for (let i = 0; i < 10; i++) permitir("uno", 1, 60_000, t0 + 1_000 * i);

  assert.equal(
    permitir("uno", 1, 60_000, t0 + 60_001).ok,
    true,
    "al vencer el unico intento real, vuelve a entrar",
  );
});

test("los limites de verdad no molestan a quien trabaja", () => {
  reiniciarLimites();
  const t0 = 1_000_000;

  // Una cuadrilla cargando 30 planillas en una hora: todas pasan.
  const { maximo, ventanaMs } = LIMITES.planilla;
  for (let i = 0; i < 30; i++) {
    const v = permitir("cuadrilla", maximo, ventanaMs, t0 + i * 60_000);
    assert.equal(v.ok, true, `planilla ${i + 1}`);
  }

  // Un vecino reportando 3 luminarias de su cuadra: todas pasan.
  reiniciarLimites();
  for (let i = 0; i < 3; i++) {
    const v = permitir(
      "vecino",
      LIMITES.reclamoVecinal.maximo,
      LIMITES.reclamoVecinal.ventanaMs,
      t0 + i * 120_000,
    );
    assert.equal(v.ok, true, `reclamo ${i + 1}`);
  }
});

test("el mensaje se entiende sin saber de sistemas", () => {
  assert.match(mensajeDeEspera(30), /30 segundos/);
  assert.match(mensajeDeEspera(600), /10 minutos/);
  assert.doesNotMatch(mensajeDeEspera(600), /milisegundo|ventana|429/);
});
