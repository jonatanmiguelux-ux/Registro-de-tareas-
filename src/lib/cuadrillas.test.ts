import test from "node:test";
import assert from "node:assert/strict";

import {
  cuadrillaDeLocalidad,
  describirZona,
  localidadesSinAsignar,
  REPARTO_INICIAL,
  type Cuadrilla,
} from "@/lib/cuadrillas";
import { LOCALIDADES } from "@/lib/localidades";

/**
 * El reparto ahora se administra desde la app, así que estas pruebas no fijan
 * quién cubre qué —eso cambia— sino que la lógica se porte bien ante cualquier
 * reparto. Un error acá manda una cuadrilla a un lugar que no le toca, o deja
 * un reclamo esperando en una lista que nadie mira.
 */

test("deriva a la cuadrilla que cubre la localidad", () => {
  const reparto: Cuadrilla[] = [
    { numero: 1, localidades: ["Nueva Atlantis", "Mar de Ajó"] },
    { numero: 7, localidades: ["Santa Teresita"] },
  ];

  assert.equal(cuadrillaDeLocalidad("Mar de Ajó", reparto), 1);
  assert.equal(cuadrillaDeLocalidad("Santa Teresita", reparto), 7);
});

test("deriva por la sigla igual que por el nombre completo", () => {
  // El vecino elige de una lista, pero la localidad puede llegar con sigla
  // desde otro lado: tiene que caer en la misma cuadrilla.
  const reparto: Cuadrilla[] = [{ numero: 3, localidades: ["Santa Teresita"] }];

  assert.equal(cuadrillaDeLocalidad("ST", reparto), 3);
  assert.equal(cuadrillaDeLocalidad("st", reparto), 3);
  assert.equal(cuadrillaDeLocalidad("S.T.", reparto), 3);
});

test("una localidad sin repartir no se deriva a nadie", () => {
  // Preferible que quede sin asignar y a la vista: adivinar mandaría un
  // equipo a un lugar que no le corresponde.
  const reparto: Cuadrilla[] = [{ numero: 1, localidades: ["Mar de Ajó"] }];

  assert.equal(cuadrillaDeLocalidad("Santa Teresita", reparto), null);
  assert.equal(cuadrillaDeLocalidad("Pinamar", reparto), null);
  assert.equal(cuadrillaDeLocalidad(null, reparto), null);
  assert.equal(cuadrillaDeLocalidad("  ", reparto), null);
});

test("sin ninguna cuadrilla cargada, nada se deriva", () => {
  assert.equal(cuadrillaDeLocalidad("Santa Teresita", []), null);
});

test("avisa qué localidades del partido quedaron sin cuadrilla", () => {
  const reparto: Cuadrilla[] = [
    { numero: 1, localidades: ["Nueva Atlantis", "Mar de Ajó"] },
  ];

  const sueltas = localidadesSinAsignar(reparto);

  assert.equal(sueltas.length, LOCALIDADES.length - 2);
  assert.ok(sueltas.includes("Santa Teresita"));
  assert.ok(!sueltas.includes("Mar de Ajó"));
});

test("el reparto inicial cubre todas las localidades, sin repetir ninguna", () => {
  // Es el que arranca funcionando antes de que nadie configure nada: si
  // dejara una localidad afuera, sus reclamos no le llegarían a ningún equipo.
  assert.deepEqual(
    localidadesSinAsignar(REPARTO_INICIAL),
    [],
    "quedaron localidades sin zona en el reparto inicial",
  );

  const todas = REPARTO_INICIAL.flatMap((c) => c.localidades);
  assert.equal(
    todas.length,
    new Set(todas).size,
    "una localidad repetida haría que dos cuadrillas vayan al mismo lugar",
  );
});

test("describe un tramo contiguo como 'de tal a tal'", () => {
  // Es como lo dice el municipio, porque las zonas son tramos del recorrido
  // de la costa.
  assert.equal(
    describirZona([
      "Costa Azul",
      "La Lucila",
      "Aguas Verdes",
      "Costa del Este",
      "Mar del Tuyú",
    ]),
    "De Costa Azul a Mar del Tuyú",
  );
});

test("no dice 'de tal a tal' si las localidades están salteadas", () => {
  // Mentiría sobre el medio: haría pensar que cubre todo el tramo.
  const salteadas = describirZona([
    "Nueva Atlantis",
    "Aguas Verdes",
    "San Clemente",
  ]);

  assert.ok(!salteadas.startsWith("De "), `dijo "${salteadas}"`);
  assert.equal(salteadas, "Nueva Atlantis · Aguas Verdes · San Clemente");
});

test("describe bien una y dos localidades, y también ninguna", () => {
  assert.equal(describirZona(["Las Toninas"]), "Las Toninas");
  assert.equal(
    describirZona(["Santa Teresita", "Costa Chica"]),
    "Santa Teresita y Costa Chica",
  );
  assert.equal(describirZona([]), "Sin localidades asignadas");
});

test("la descripción no depende del orden en que estén cargadas", () => {
  // En la base quedan en el orden en que las fue asignando quien reparte.
  assert.equal(
    describirZona(["Mar del Tuyú", "Costa Azul", "Costa del Este", "La Lucila", "Aguas Verdes"]),
    "De Costa Azul a Mar del Tuyú",
  );
});
