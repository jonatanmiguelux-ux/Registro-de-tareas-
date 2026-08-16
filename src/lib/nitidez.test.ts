import test from "node:test";
import assert from "node:assert/strict";

import { esDeNoche } from "@/lib/nitidez";

/**
 * `analizarNitidez` necesita un navegador —usa canvas— así que el umbral se
 * validó a mano contra fotos reales. Lo que sí se prueba acá es cuándo aparece
 * el recordatorio del flash, que ahora depende del sol y no de una hora fija.
 *
 * Las horas de referencia son las de La Costa: en enero el sol se oculta cerca
 * de las 20:07 y en junio cerca de las 17:38.
 */

/** Un momento del día, en la zona horaria de la máquina que corre esto. */
const en = (mes: number, dia: number, hora: number, minuto = 0) =>
  new Date(2026, mes - 1, dia, hora, minuto);

test("en verano, a las siete de la tarde todavía hay luz", () => {
  // La regla vieja de "19 a 7" mostraba el aviso acá, con el sol arriba.
  assert.equal(esDeNoche(en(1, 15, 19, 0)), false);
  assert.equal(esDeNoche(en(1, 15, 19, 55)), false, "faltan minutos para que se oculte");
});

test("en verano oscurece pasadas las ocho", () => {
  assert.equal(esDeNoche(en(1, 15, 20, 30)), true);
  assert.equal(esDeNoche(en(1, 15, 23, 0)), true);
});

test("en invierno ya está oscuro a las seis de la tarde", () => {
  // Esto es lo que la regla fija se perdía: una hora larga de oscuridad real
  // sin recordarle el flash a nadie, justo cuando más se reclama.
  assert.equal(esDeNoche(en(6, 21, 18, 0)), true);
  assert.equal(esDeNoche(en(6, 21, 18, 30)), true);
});

test("en invierno todavía es de noche a las siete y media de la mañana", () => {
  // El sol sale cerca de las 7:58: la regla fija cortaba el aviso a las 7.
  assert.equal(esDeNoche(en(6, 21, 7, 30)), true);
  assert.equal(esDeNoche(en(6, 21, 8, 30)), false, "a esa hora ya salió");
});

test("al mediodía nunca es de noche, en ninguna estación", () => {
  for (const mes of [1, 3, 6, 9, 12]) {
    assert.equal(esDeNoche(en(mes, 15, 13, 0)), false, `falló en el mes ${mes}`);
  }
});

test("la noche dura más en invierno que en verano", () => {
  // Comprobación de que el cálculo sigue las estaciones y no devuelve
  // cualquier cosa: en el hemisferio sur, junio tiene noches más largas.
  const horasDeNoche = (mes: number, dia: number) => {
    let cuenta = 0;
    for (let h = 0; h < 24; h++) if (esDeNoche(en(mes, dia, h, 30))) cuenta++;
    return cuenta;
  };

  const verano = horasDeNoche(1, 15);
  const invierno = horasDeNoche(6, 21);

  assert.ok(
    invierno > verano,
    `invierno ${invierno} h deberían superar a verano ${verano} h`,
  );
});
