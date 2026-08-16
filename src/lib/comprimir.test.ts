import test from "node:test";
import assert from "node:assert/strict";

import {
  nombreJpg,
  describirAhorro,
  PLANILLA,
  LUMINARIA,
} from "@/lib/comprimir";

/**
 * El dibujado en sí necesita un navegador, así que acá se prueban las piezas
 * que no lo necesitan y las decisiones que más caro salen si se tocan sin
 * pensar: las medidas.
 */

test("el nombre pasa a .jpg conservando el resto", () => {
  assert.equal(nombreJpg("planilla.png"), "planilla.jpg");
  assert.equal(nombreJpg("IMG_20260816_193045.heic"), "IMG_20260816_193045.jpg");
  assert.equal(nombreJpg("sin extension"), "sin extension.jpg");
  assert.equal(nombreJpg("foto.con.puntos.jpeg"), "foto.con.puntos.jpg");
});

test("un nombre vacio no deja el archivo sin nombre", () => {
  assert.equal(nombreJpg(""), "foto.jpg");
  assert.equal(nombreJpg(".jpg"), "foto.jpg");
});

test("el ahorro se cuenta en megas, y no se anuncia si es insignificante", () => {
  assert.equal(describirAhorro(8 * 1024 * 1024, 1 * 1024 * 1024), "8.0 MB → 1.0 MB");
  assert.equal(describirAhorro(1000, 990), null, "un 1% no se anuncia");
  assert.equal(describirAhorro(1000, 1200), null, "si crecio, no se anuncia");
  assert.equal(describirAhorro(1000, 1000), null, "si quedo igual, tampoco");
});

/**
 * Las medidas de la planilla son la decisión más delicada de todo el archivo.
 * Bajarlas ahorra disco y rompe la lectura de la letra manuscrita, que es la
 * razón de ser de la app. Estas pruebas están para que nadie las toque sin
 * darse cuenta de lo que está tocando.
 */
test("la planilla se guarda con mas resolucion que la luminaria", () => {
  assert.ok(
    PLANILLA.lado > LUMINARIA.lado,
    "la planilla la lee una IA letra por letra; la luminaria solo se mira",
  );
  assert.ok(PLANILLA.calidad > LUMINARIA.calidad);
});

test("la planilla no baja del umbral que deja legible una hoja A4", () => {
  // Una A4 tiene 297 mm de lado largo = 11,7 pulgadas. Con 2400 px quedan
  // ~205 ppp, de sobra para numeros escritos a mano. Por debajo de 2000 la
  // lectura empieza a fallar.
  assert.ok(PLANILLA.lado >= 2000, `lado ${PLANILLA.lado} es muy chico`);
  const ppp = PLANILLA.lado / 11.7;
  assert.ok(ppp >= 170, `${Math.round(ppp)} ppp es poco para letra manuscrita`);
});

test("la calidad de la planilla es alta: el JPEG se come los trazos finos", () => {
  assert.ok(PLANILLA.calidad >= 0.85, "por debajo aparecen artefactos en la letra");
});

test("las medidas son sensatas y no invierten el sentido", () => {
  for (const m of [PLANILLA, LUMINARIA]) {
    assert.ok(m.lado > 0 && m.lado <= 4000, `lado raro: ${m.lado}`);
    assert.ok(m.calidad > 0 && m.calidad <= 1, `calidad rara: ${m.calidad}`);
  }
});
