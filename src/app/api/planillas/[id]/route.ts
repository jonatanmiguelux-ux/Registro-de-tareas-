import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { borrarImagen } from "@/lib/almacenamiento";
import { parsearFecha } from "@/lib/fechas";
import { normalizarDiagnostico } from "@/lib/diagnosticos";
import { usuarioDeApi, rolDeApi } from "@/lib/sesion";

export const runtime = "nodejs";

const ReclamoCorregido = z.object({
  id: z.string(),
  fecha: z.string().nullable(),
  oficial: z.string().nullable(),
  chofer: z.string().nullable(),
  movil: z.string().nullable(),
  localidad: z.string().nullable(),
  tipoReclamo: z.string().nullable(),
  fechaIngreso: z.string().nullable(),
  nroIncidente: z.string().nullable(),
  calle: z.string().nullable(),
  numero: z.string().nullable(),
  diagnostico: z.string().nullable(),
  observaciones: z.string().nullable(),
  /** IDs de material marcados tras la corrección humana. */
  materiales: z.array(z.object({ materialId: z.string(), cantidad: z.number() })),
});

const CuerpoPatch = z.object({
  confirmar: z.boolean().optional(),
  reclamos: z.array(ReclamoCorregido),
});

/** GET /api/planillas/:id — la planilla con sus reclamos y marcas. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const sesion = await usuarioDeApi();
  if (!sesion.ok) return sesion.respuesta;

  const { id } = await params;
  const planilla = await prisma.planilla.findUnique({
    where: { id },
    include: {
      reclamos: {
        orderBy: { orden: "asc" },
        include: { materiales: true },
      },
    },
  });

  if (!planilla) {
    return NextResponse.json({ error: "No existe la planilla." }, { status: 404 });
  }
  return NextResponse.json(planilla);
}

/**
 * PATCH /api/planillas/:id — guarda las correcciones de la revisión manual.
 *
 * Reemplaza los campos de cada reclamo y su set de materiales. Cada reclamo
 * tocado queda marcado como revisado, para poder distinguir después qué salió
 * de la IA y qué validó una persona.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const sesion = await usuarioDeApi();
  if (!sesion.ok) return sesion.respuesta;

  const { id } = await params;
  const cuerpo = CuerpoPatch.safeParse(await request.json());

  if (!cuerpo.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", detalle: cuerpo.error.issues },
      { status: 400 },
    );
  }

  const planilla = await prisma.planilla.findUnique({
    where: { id },
    select: { id: true, reclamos: { select: { id: true } } },
  });

  if (!planilla) {
    return NextResponse.json({ error: "No existe la planilla." }, { status: 404 });
  }

  const propios = new Set(planilla.reclamos.map((r) => r.id));
  const ajenos = cuerpo.data.reclamos.filter((r) => !propios.has(r.id));
  if (ajenos.length > 0) {
    return NextResponse.json(
      { error: "Hay reclamos que no pertenecen a esta planilla." },
      { status: 400 },
    );
  }

  await prisma.$transaction(async (tx) => {
    for (const fila of cuerpo.data.reclamos) {
      await tx.reclamo.update({
        where: { id: fila.id },
        data: {
          fecha: parsearFecha(fila.fecha),
          oficial: fila.oficial,
          chofer: fila.chofer,
          movil: fila.movil,
          localidad: fila.localidad,
          tipoReclamo: fila.tipoReclamo,
          fechaIngreso: parsearFecha(fila.fechaIngreso),
          nroIncidente: fila.nroIncidente,
          calle: fila.calle,
          numero: fila.numero,
          // Una persona con el papel delante puede escribir el diagnóstico
          // como quiera; se normaliza igual que en el alta para que el
          // historial no termine con "C/C" y "Cable Cortado" conviviendo.
          diagnostico: normalizarDiagnostico(fila.diagnostico),
          observaciones: fila.observaciones,
          revisado: true,
        },
      });

      await tx.reclamoMaterial.deleteMany({ where: { reclamoId: fila.id } });
      if (fila.materiales.length > 0) {
        await tx.reclamoMaterial.createMany({
          data: fila.materiales.map((m) => ({
            reclamoId: fila.id,
            materialId: m.materialId,
            cantidad: m.cantidad,
          })),
          skipDuplicates: true,
        });
      }
    }

    await tx.planilla.update({
      where: { id },
      data: cuerpo.data.confirmar
        ? {
            estado: "CONFIRMADA",
            confirmadoEn: new Date(),
            // Confirmar es el acto por el que alguien se hace responsable de
            // que lo cargado coincide con el papel, y es lo que habilita el
            // descuento de stock: queda registrado quién lo hizo.
            confirmadaPorId: sesion.usuario.id,
          }
        : { estado: "EN_REVISION" },
    });
    // Igual que en el alta: reescribir todas las filas de una planilla larga
    // supera con facilidad el tope de 5 s que trae Prisma por defecto.
  }, { timeout: 60_000, maxWait: 10_000 });

  return NextResponse.json({ ok: true });
}

/** DELETE /api/planillas/:id — descarta una carga junto con su foto. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const sesion = await rolDeApi("ENCARGADO");
  if (!sesion.ok) return sesion.respuesta;

  const { id } = await params;
  const planilla = await prisma.planilla.findUnique({
    where: { id },
    select: { archivoRuta: true },
  });

  if (!planilla) {
    return NextResponse.json({ error: "No existe la planilla." }, { status: 404 });
  }

  // Los reclamos y sus marcas caen en cascada por el esquema.
  await prisma.planilla.delete({ where: { id } });
  await borrarImagen(planilla.archivoRuta);

  return NextResponse.json({ ok: true });
}
