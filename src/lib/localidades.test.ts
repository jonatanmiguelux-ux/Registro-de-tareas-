import test from "node:test";
import assert from "node:assert/strict";

import {
  agruparPorLocalidad,
  compararLocalidades,
  normalizarLocalidad,
  SIN_LOCALIDAD,
} from "@/lib/localidades";

/**
 * El punto de todo esto es que la localidad agrupe igual sin importar cómo
 * estaba escrita en el papel. Un fallo acá no se ve: el Excel sale con
 * "Santa Teresita" y "ST" como dos filas distintas, y los totales por
 * localidad quedan partidos al medio sin que nadie lo note.
 */

type Fila = { localidad: string | null };

test("junta la sigla y el nombre completo en un solo grupo", () => {
  const filas: Fila[] = [
    { localidad: "ST" },
    { localidad: "Santa Teresita" },
    { localidad: "st" },
    { localidad: "S.T." },
  ];

  const grupos = agruparPorLocalidad(filas, (f) => f.localidad);

  assert.equal(grupos.length, 1, "las cuatro son la misma localidad");
  assert.equal(grupos[0].localidad, "Santa Teresita");
  assert.equal(grupos[0].filas.length, 4);
});

test("respeta el orden del municipio, no el alfabético", () => {
  const filas: Fila[] = [
    { localidad: "SC" }, // San Clemente, último de la lista
    { localidad: "NA" }, // Nueva Atlantis, primero
    { localidad: "AV" }, // Aguas Verdes, quinto
  ];

  const grupos = agruparPorLocalidad(filas, (f) => f.localidad);

  assert.deepEqual(
    grupos.map((g) => g.localidad),
    ["Nueva Atlantis", "Aguas Verdes", "San Clemente"],
    "alfabéticamente Aguas Verdes iría primero; acá manda el orden del partido",
  );
});

test("las filas sin localidad quedan al final, no mezcladas", () => {
  const filas: Fila[] = [
    { localidad: null },
    { localidad: "SC" },
    { localidad: "  " },
    { localidad: "NA" },
  ];

  const grupos = agruparPorLocalidad(filas, (f) => f.localidad);

  assert.equal(
    grupos[grupos.length - 1].localidad,
    SIN_LOCALIDAD,
    "van al final: son las que hay que completar a mano",
  );
  assert.equal(grupos[grupos.length - 1].filas.length, 2);
});

test("una localidad que no está en la lista no se pierde", () => {
  const filas: Fila[] = [
    { localidad: "Pinamar" },
    { localidad: "NA" },
    { localidad: null },
  ];

  const grupos = agruparPorLocalidad(filas, (f) => f.localidad);

  assert.deepEqual(
    grupos.map((g) => g.localidad),
    ["Nueva Atlantis", "Pinamar", SIN_LOCALIDAD],
    "las desconocidas van después de las del partido, pero antes de las vacías",
  );
});

test("normalizar es idempotente: normalizar dos veces da lo mismo", () => {
  // Importa porque el valor pasa por el normalizador al cargar y otra vez al
  // agrupar; si la segunda pasada lo cambiara, el grupo no cerraría.
  for (const valor of ["ST", "MdA", "Santa Teresita", "Pinamar", "CCh"]) {
    const una = normalizarLocalidad(valor);
    const dos = normalizarLocalidad(una);
    assert.equal(dos, una, `"${valor}" cambia al normalizar dos veces`);
  }
});

test("comparar ordena una lista suelta igual que el agrupador", () => {
  const nombres = [
    "San Clemente",
    null,
    "Aguas Verdes",
    "Pinamar",
    "Nueva Atlantis",
  ];

  assert.deepEqual([...nombres].sort(compararLocalidades), [
    "Nueva Atlantis",
    "Aguas Verdes",
    "San Clemente",
    "Pinamar",
    null,
  ]);
});
