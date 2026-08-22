import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { panolDeApi } from "@/lib/sesion";
import { stockPanol } from "@/lib/stock";
import { parsearFecha } from "@/lib/fechas";
import { MOVILES } from "@/config/municipio";

export const runtime = "nodejs";

const Entrega = z.object({
  movil: z.number().int(),
  materialId: z.string().min(1).max(40),
  // Sin tope por arriba desbordaría los cálculos; 1.000.000 es holgado.
  cantidad: z.number().positive().max(1_000_000),
  // ENTREGA: del pañol al móvil. DEVOLUCION: el móvil devuelve al pañol.
  tipo: z.enum(["ENTREGA", "DEVOLUCION"]).default("ENTREGA"),
  fecha: z.string().max(40).nullable().optional(),
  nota: z.string().max(500).nullable().optional(),
});

/**
 * POST /api/entregas — registra una entrega del pañol a un móvil.
 *
 * La entrega descuenta del pañol y suma al móvil; la devolución hace lo
 * inverso. Se guarda con la cantidad firmada (positiva la entrega, negativa la
 * devolución), que es lo que suman las dos pantallas de stock.
 */
export async function POST(request: Request) {
  const sesion = await panolDeApi();
  if (!sesion.ok) return sesion.respuesta;

  const cuerpo = Entrega.safeParse(await request.json().catch(() => null));
  if (!cuerpo.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", detalle: cuerpo.error.issues },
      { status: 400 },
    );
  }
  const { movil, materialId, cantidad, tipo, fecha, nota } = cuerpo.data;

  if (!MOVILES.includes(movil)) {
    return NextResponse.json({ error: "Ese móvil no existe." }, { status: 400 });
  }

  const material = await prisma.material.findUnique({
    where: { id: materialId },
    select: { id: true, nombre: true },
  });
  if (!material) {
    return NextResponse.json({ error: "No existe el material." }, { status: 404 });
  }

  // Una entrega no puede sacar del pañol más de lo que hay. La devolución no se
  // controla: siempre se puede devolver material al depósito.
  if (tipo === "ENTREGA") {
    const enPanol =
      (await stockPanol()).find((f) => f.materialId === materialId)?.enPanol ?? 0;
    if (cantidad > enPanol) {
      return NextResponse.json(
        {
          error: `El pañol tiene ${enPanol} de ${material.nombre}. No se pueden entregar ${cantidad}.`,
        },
        { status: 409 },
      );
    }
  }

  const entrega = await prisma.entregaMaterial.create({
    data: {
      movil,
      materialId,
      cantidad: tipo === "ENTREGA" ? cantidad : -cantidad,
      fecha: parsearFecha(fecha ?? null) ?? new Date(),
      nota: nota?.trim() || null,
      entregadaPorId: sesion.usuario.id,
    },
  });

  return NextResponse.json(entrega, { status: 201 });
}

const Borrar = z.object({ id: z.string().min(1).max(40) });

/** DELETE /api/entregas — deshace una entrega cargada por error. */
export async function DELETE(request: Request) {
  const sesion = await panolDeApi();
  if (!sesion.ok) return sesion.respuesta;

  const cuerpo = Borrar.safeParse(await request.json().catch(() => null));
  if (!cuerpo.success) {
    return NextResponse.json({ error: "Falta el id." }, { status: 400 });
  }

  try {
    await prisma.entregaMaterial.delete({ where: { id: cuerpo.data.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No existe la entrega." }, { status: 404 });
  }
}
