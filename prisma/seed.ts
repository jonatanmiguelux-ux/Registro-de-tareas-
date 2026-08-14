import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Catálogo de materiales de la planilla de alumbrado público, en el mismo
 * orden en que están las columnas en el papel (de izquierda a derecha).
 *
 * Precargarlo no es obligatorio —la IA da de alta sola las columnas que lee—
 * pero conviene: fija la nomenclatura desde la primera planilla y evita que
 * dos fotos generen dos variantes del mismo material ("Sodio 100" y "sodio
 * 100"), que después habría que unificar a mano.
 */
const MATERIALES: { nombre: string; grupo: string }[] = [
  // Lámparas
  { nombre: "LED E27", grupo: "Lámparas" },
  { nombre: "Adaptador", grupo: "Lámparas" },
  { nombre: "LED 60", grupo: "Lámparas" },
  { nombre: "LED 120", grupo: "Lámparas" },
  { nombre: "LED 180", grupo: "Lámparas" },
  { nombre: "Sodio 100", grupo: "Lámparas" },
  { nombre: "Sodio 150", grupo: "Lámparas" },
  { nombre: "Sodio 250", grupo: "Lámparas" },
  { nombre: "Sodio 400", grupo: "Lámparas" },
  { nombre: "H/Q 250", grupo: "Lámparas" },
  { nombre: "H/Q 400", grupo: "Lámparas" },

  // Balastos
  { nombre: "B 100 int", grupo: "Balastos" },
  { nombre: "B 150 int", grupo: "Balastos" },
  { nombre: "B 150 ext", grupo: "Balastos" },
  { nombre: "B 250 int", grupo: "Balastos" },
  { nombre: "B 400 int", grupo: "Balastos" },

  // Otros materiales
  { nombre: "Fotocontrol", grupo: "Otros materiales" },
  { nombre: "Zócalo ext", grupo: "Otros materiales" },
  { nombre: "Goliat", grupo: "Otros materiales" },
  { nombre: "Morceto", grupo: "Otros materiales" },
  { nombre: "Ignitor", grupo: "Otros materiales" },
];

async function main() {
  for (const [indice, material] of MATERIALES.entries()) {
    await prisma.material.upsert({
      where: { nombre: material.nombre },
      update: { grupo: material.grupo, orden: indice + 1 },
      create: {
        nombre: material.nombre,
        grupo: material.grupo,
        unidad: "u",
        orden: indice + 1,
      },
    });
  }

  console.log(`Catálogo cargado: ${MATERIALES.length} materiales.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
