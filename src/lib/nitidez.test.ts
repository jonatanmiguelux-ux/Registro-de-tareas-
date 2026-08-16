import test from "node:test";
import assert from "node:assert/strict";

import { esDeNoche } from "@/lib/nitidez";

/**
 * `analizarNitidez` necesita un navegador —usa canvas— así que se prueba a
 * mano con fotos reales. Lo que sí se puede fijar acá es la regla horaria,
 * que decide cuándo aparece el recordatorio del flash.
 */

test("es de noche a partir de las siete de la tarde", () => {
  const a = (hora: number) => new Date(2026, 7, 16, hora, 0, 0);

  assert.equal(esDeNoche(a(19)), true, "las 19 ya cuentan como noche");
  assert.equal(esDeNoche(a(23)), true);
  assert.equal(esDeNoche(a(3)), true, "la madrugada también");
  assert.equal(esDeNoche(a(6)), true, "las 6 todavía está oscuro");
});

test("no es de noche durante la jornada", () => {
  const a = (hora: number) => new Date(2026, 7, 16, hora, 0, 0);

  assert.equal(esDeNoche(a(7)), false, "a las 7 ya hay luz");
  assert.equal(esDeNoche(a(12)), false);
  assert.equal(esDeNoche(a(18)), false, "las 18 son el último tramo con luz");
});

test("el aviso cubre la franja en que se reportan las luces apagadas", () => {
  // Una luminaria que no enciende sólo se nota de noche: si el aviso no
  // cubriera esa franja, no serviría para nada.
  let conAviso = 0;
  for (let hora = 0; hora < 24; hora++) {
    if (esDeNoche(new Date(2026, 7, 16, hora))) conAviso++;
  }
  assert.equal(conAviso, 12, "doce horas de aviso, de 19 a 7");
});
