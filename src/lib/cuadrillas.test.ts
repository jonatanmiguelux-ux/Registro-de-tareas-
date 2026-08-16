import test from "node:test";
import assert from "node:assert/strict";

import { CUADRILLAS, cuadrillaDeLocalidad } from "@/lib/cuadrillas";
import { LOCALIDADES } from "@/lib/localidades";

/**
 * Un error acá manda una cuadrilla a un lugar que no le toca, y el reclamo del
 * vecino queda esperando en una lista que nadie mira.
 */

test("cada zona cubre exactamente las localidades acordadas", () => {
  assert.deepEqual(
    CUADRILLAS.map((c) => [c.numero, c.localidades]),
    [
      [1, ["Nueva Atlantis", "Mar de Ajó"]],
      [
        2,
        [
          "Costa Azul",
          "La Lucila",
          "Aguas Verdes",
          "Costa del Este",
          "Mar del Tuyú",
        ],
      ],
      [3, ["Santa Teresita", "Costa Chica"]],
      [4, ["Las Toninas", "San Clemente"]],
    ],
  );
});

test("todas las localidades del partido tienen cuadrilla", () => {
  const huerfanas = LOCALIDADES.filter(
    (l) => cuadrillaDeLocalidad(l.nombre) === null,
  );

  assert.deepEqual(
    huerfanas.map((l) => l.nombre),
    [],
    "quedaron localidades sin zona: sus reclamos no le llegarían a nadie",
  );
});

test("ninguna localidad está en dos zonas", () => {
  const todas = CUADRILLAS.flatMap((c) => c.localidades);
  assert.equal(
    todas.length,
    new Set(todas).size,
    "una localidad repetida haría que dos cuadrillas vayan al mismo lugar",
  );
});

test("deriva por la sigla igual que por el nombre completo", () => {
  // El vecino elige de una lista, pero la localidad podría llegar con sigla
  // desde otro lado: tiene que caer en la misma cuadrilla.
  assert.equal(cuadrillaDeLocalidad("ST"), 3);
  assert.equal(cuadrillaDeLocalidad("Santa Teresita"), 3);
  assert.equal(cuadrillaDeLocalidad("MdA"), 1);
  assert.equal(cuadrillaDeLocalidad("mda"), 1);
  assert.equal(cuadrillaDeLocalidad("SC"), 4);
});

test("los tramos son contiguos sobre el recorrido de la costa", () => {
  // Las zonas se describen como "de tal a tal" porque son tramos de ruta. Si
  // alguien reordenara las localidades sin mirar esto, las zonas quedarían
  // salteadas y la descripción dejaría de ser cierta.
  const orden = LOCALIDADES.map((l) => l.nombre);

  for (const cuadrilla of CUADRILLAS) {
    const posiciones = cuadrilla.localidades
      .map((l) => orden.indexOf(l))
      .sort((a, b) => a - b);

    for (let i = 1; i < posiciones.length; i++) {
      assert.equal(
        posiciones[i],
        posiciones[i - 1] + 1,
        `la cuadrilla ${cuadrilla.numero} cubre localidades salteadas`,
      );
    }
  }
});

test("una localidad de afuera del partido no se deriva a nadie", () => {
  // Preferible que quede sin asignar y a la vista: adivinar mandaría un
  // equipo a un lugar que no le corresponde.
  assert.equal(cuadrillaDeLocalidad("Pinamar"), null);
  assert.equal(cuadrillaDeLocalidad(null), null);
  assert.equal(cuadrillaDeLocalidad("  "), null);
});
