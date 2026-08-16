import test from "node:test";
import assert from "node:assert/strict";

import { ESCALERA, alcanza, NOMBRE_ROL } from "@/lib/roles";

/**
 * La jerarquía decide quién puede tocar qué. Un error acá no rompe nada
 * visible: simplemente le abre a alguien una puerta que no le corresponde, y
 * eso no se nota hasta que ya pasó.
 */

test("cada rol se alcanza a sí mismo", () => {
  for (const rol of ESCALERA) {
    assert.equal(alcanza(rol, rol), true, rol);
  }
});

test("el orden va de menos a más", () => {
  assert.deepEqual(ESCALERA, [
    "OPERARIO",
    "ENCARGADO",
    "JEFE",
    "ADMINISTRADOR",
  ]);
});

test("un rol alcanza todo lo que está por debajo y nada por encima", () => {
  ESCALERA.forEach((rol, i) => {
    ESCALERA.forEach((minimo, j) => {
      assert.equal(
        alcanza(rol, minimo),
        i >= j,
        `${rol} contra ${minimo}`,
      );
    });
  });
});

test("el operario no llega a nada más que a lo suyo", () => {
  assert.equal(alcanza("OPERARIO", "ENCARGADO"), false);
  assert.equal(alcanza("OPERARIO", "JEFE"), false);
  assert.equal(alcanza("OPERARIO", "ADMINISTRADOR"), false);
});

test("el jefe gestiona cuentas pero no es administrador", () => {
  assert.equal(alcanza("JEFE", "JEFE"), true);
  assert.equal(alcanza("JEFE", "ADMINISTRADOR"), false);
});

test("el encargado no entra a cuentas", () => {
  assert.equal(alcanza("ENCARGADO", "ENCARGADO"), true);
  assert.equal(alcanza("ENCARGADO", "JEFE"), false);
});

test("todos los roles tienen nombre para mostrar", () => {
  for (const rol of ESCALERA) {
    assert.equal(typeof NOMBRE_ROL[rol], "string");
    assert.ok(NOMBRE_ROL[rol].length > 0, rol);
  }
});
