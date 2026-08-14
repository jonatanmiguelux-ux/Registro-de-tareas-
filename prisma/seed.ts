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
const MATERIALES: {
  nombre: string;
  grupo: string;
  /** false para los que no tienen columna propia y se anotan a mano. */
  columnaImpresa?: boolean;
}[] = [
  // Lámparas
  { nombre: "LED E27", grupo: "Lámparas" },
  { nombre: "LED E40", grupo: "Lámparas" },
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

  // Otros materiales. En el papel está impreso "Otras materiales", pero el
  // grupo es taxonomía nuestra, no un dato de la planilla: se deja en singular
  // correcto y consistente con el resto del código, que ya agrupa por este
  // nombre.
  { nombre: "Fotocontrol", grupo: "Otros materiales" },
  { nombre: "Zócalo ext", grupo: "Otros materiales" },
  { nombre: "Edison", grupo: "Otros materiales" },
  { nombre: "Goliat", grupo: "Otros materiales" },
  { nombre: "Morteto", grupo: "Otros materiales" },
  { nombre: "Ignitor", grupo: "Otros materiales" },

  // Sin columna impresa: se escribe "AD" a mano en la celda de la lámpara que
  // se cambió. Consume stock como cualquier otro, pero va último y marcado
  // para que no entre en la lista ordenada de columnas.
  { nombre: "Adaptador", grupo: "Otros materiales", columnaImpresa: false },
];

async function main() {
  for (const [indice, material] of MATERIALES.entries()) {
    const columnaImpresa = material.columnaImpresa ?? true;
    await prisma.material.upsert({
      where: { nombre: material.nombre },
      update: { grupo: material.grupo, orden: indice + 1, columnaImpresa },
      create: {
        nombre: material.nombre,
        grupo: material.grupo,
        unidad: "u",
        orden: indice + 1,
        columnaImpresa,
      },
    });
  }

  console.log(`Catálogo cargado: ${MATERIALES.length} materiales.`);

  // Una corrida anterior pudo haber dejado columnas que no existen en el papel.
  // Se van sólo si nadie las usa: un material con consumo o movimientos ya es
  // un dato, y borrarlo se llevaría puesto el histórico por cascada.
  const sobrantes = await prisma.material.findMany({
    where: { nombre: { notIn: MATERIALES.map((m) => m.nombre) } },
    include: { _count: { select: { reclamos: true, movimientos: true } } },
  });

  if (sobrantes.length === 0) return;

  const sinUso = sobrantes.filter(
    (m) => m._count.reclamos === 0 && m._count.movimientos === 0,
  );
  const enUso = sobrantes.filter(
    (m) => m._count.reclamos > 0 || m._count.movimientos > 0,
  );

  if (sinUso.length > 0) {
    await prisma.material.deleteMany({
      where: { id: { in: sinUso.map((m) => m.id) } },
    });
    console.log(
      `Se quitaron ${sinUso.length} columnas que no están en el papel: ${sinUso
        .map((m) => m.nombre)
        .join(", ")}.`,
    );
  }

  if (enUso.length > 0) {
    console.log(
      `Quedan fuera del catálogo pero CON datos cargados, así que no se tocan: ${enUso
        .map((m) => `${m.nombre} (${m._count.reclamos} reclamos)`)
        .join(", ")}. Revisalos a mano.`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
