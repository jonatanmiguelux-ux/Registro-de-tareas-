import test from "node:test";
import assert from "node:assert/strict";

import { detectarTipoImagen, verificarImagen } from "@/lib/imagenes";

/**
 * El punto de estas pruebas: que subir un archivo cualquiera **declarándolo**
 * imagen no alcance para que entre. El tipo que manda el navegador lo elige
 * quien sube; la firma de los primeros bytes, no.
 */

/** Arma un buffer que empieza con esos bytes y sigue con relleno. */
function conFirma(...bytes: number[]): Buffer {
  return Buffer.concat([Buffer.from(bytes), Buffer.alloc(64, 0x20)]);
}

const JPEG = conFirma(0xff, 0xd8, 0xff, 0xe0);
const PNG = conFirma(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const WEBP = Buffer.concat([
  Buffer.from("RIFF"),
  Buffer.from([0, 0, 0, 0]),
  Buffer.from("WEBP"),
  Buffer.alloc(64, 0x20),
]);
const HEIC = Buffer.concat([
  Buffer.from([0, 0, 0, 0x18]),
  Buffer.from("ftyp"),
  Buffer.from("heic"),
  Buffer.alloc(64, 0x20),
]);

test("reconoce los formatos que la app acepta", () => {
  assert.equal(detectarTipoImagen(JPEG), "image/jpeg");
  assert.equal(detectarTipoImagen(PNG), "image/png");
  assert.equal(detectarTipoImagen(WEBP), "image/webp");
  assert.equal(detectarTipoImagen(HEIC), "image/heic");
});

test("rechaza un archivo que se hace pasar por foto", () => {
  // Un ejecutable de Windows con el nombre y el tipo de una foto.
  const ejecutable = Buffer.concat([
    Buffer.from("MZ"),
    Buffer.alloc(64, 0x00),
  ]);

  assert.equal(detectarTipoImagen(ejecutable), null);

  const resultado = verificarImagen(ejecutable, "image/jpeg");
  assert.equal(resultado.ok, false, "declararlo image/jpeg no lo hace pasar");
});

test("rechaza texto plano y HTML disfrazados", () => {
  for (const contenido of [
    "<script>alert(1)</script>",
    "GIF89a",
    "no soy una imagen",
    "%PDF-1.7",
  ]) {
    const bytes = Buffer.from(contenido);
    assert.equal(
      verificarImagen(bytes, "image/png").ok,
      false,
      `"${contenido.slice(0, 20)}" no debería pasar`,
    );
  }
});

test("rechaza un archivo demasiado corto para tener firma", () => {
  assert.equal(detectarTipoImagen(Buffer.from([0xff, 0xd8])), null);
  assert.equal(detectarTipoImagen(Buffer.alloc(0)), null);
});

test("manda el tipo real, no el que declaró el navegador", () => {
  // Pasa solo, sin mala intención: algunos celulares reetiquetan la foto al
  // compartirla. No es motivo para rechazarla, pero sí para no creerle.
  const resultado = verificarImagen(PNG, "image/jpeg");

  assert.equal(resultado.ok, true);
  assert.equal(
    resultado.ok && resultado.tipo,
    "image/png",
    "de acá en adelante se usa el tipo detectado",
  );
});

test("acepta la foto aunque el navegador no declare tipo", () => {
  const resultado = verificarImagen(JPEG, "");
  assert.equal(resultado.ok, true);
  assert.equal(resultado.ok && resultado.tipo, "image/jpeg");
});
