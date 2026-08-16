/**
 * Genera el .xlsx sin pasar por el navegador.
 *
 * El botón Exportar de la app arma el archivo en memoria y se lo manda al
 * navegador: nunca queda en el disco. Para poder respaldarlo todos los días a
 * las 12 sin que nadie apriete nada, hace falta generarlo desde afuera.
 *
 * Usa **las mismas funciones** que la pantalla (`construirLibro`), así el
 * archivo automático y el que baja una persona a mano son idénticos. Si
 * mañana se agrega una columna al Excel, aparece en los dos sin tocar esto.
 *
 * Uso:
 *     npx tsx scripts/exportar.ts --salida "C:\ruta\archivo.xlsx"
 */

import { writeFile } from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { construirLibro } from "@/lib/excel";
import { listarMateriales } from "@/lib/materiales";
import { consumoPorMaterial } from "@/lib/consultas";
import type { FiltrosReclamo } from "@/lib/filtros";

/** Sin filtros: el archivo automático es siempre la foto completa. */
const TODO: FiltrosReclamo = {
  desde: null,
  hasta: null,
  cuadrilla: null,
  estado: null,
  incidente: null,
};

function leerArgumento(nombre: string): string | null {
  const i = process.argv.indexOf(nombre);
  if (i === -1 || i + 1 >= process.argv.length) return null;
  return process.argv[i + 1];
}

async function principal() {
  const salida = leerArgumento("--salida");
  if (!salida) {
    console.error("Falta --salida con la ruta del archivo a escribir.");
    process.exit(1);
  }

  const [reclamos, materiales, consumo] = await Promise.all([
    prisma.reclamo.findMany({
      orderBy: [{ fecha: "asc" }, { planillaId: "asc" }, { orden: "asc" }],
      include: { materiales: true, planilla: true },
    }),
    listarMateriales(),
    consumoPorMaterial(TODO),
  ]);

  const libro = await construirLibro(reclamos, materiales, consumo);
  await writeFile(salida, libro);

  // Lo lee el script de PowerShell para poder informar qué se guardó.
  console.log(`reclamos=${reclamos.length}`);
  console.log(`bytes=${libro.length}`);
}

principal()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
