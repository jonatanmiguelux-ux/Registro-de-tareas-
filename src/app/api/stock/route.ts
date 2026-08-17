import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { calcularStock } from "@/lib/stock";
import { parsearFecha } from "@/lib/fechas";
import { usuarioDeApi, rolDeApi } from "@/lib/sesion";

export const runtime = "nodejs";

/** GET /api/stock — stock actual por material. */
export async function GET() {
  const sesion = await usuarioDeApi();
  if (!sesion.ok) return sesion.respuesta;

  return NextResponse.json(await calcularStock());
}

const Movimiento = z.object({
  materialId: z.string().min(1).max(40),
  tipo: z.enum(["ENTRADA", "SALIDA"]),
  // Acotada por arriba: sin tope, un número enorme desbordaría los cálculos
  // de stock. 1.000.000 es holgado para cualquier depósito real.
  cantidad: z.number().positive().max(1_000_000),
  fecha: z.string().max(40).nullable().optional(),
  nota: z.string().max(500).nullable().optional(),
});

/** POST /api/stock — registra una entrada o una salida de depósito. */
export async function POST(request: Request) {
  const sesion = await usuarioDeApi();
  if (!sesion.ok) return sesion.respuesta;

  const cuerpo = Movimiento.safeParse(await request.json().catch(() => null));
  if (!cuerpo.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", detalle: cuerpo.error.issues },
      { status: 400 },
    );
  }

  const material = await prisma.material.findUnique({
    where: { id: cuerpo.data.materialId },
    select: { id: true },
  });
  if (!material) {
    return NextResponse.json({ error: "No existe el material." }, { status: 404 });
  }

  const movimiento = await prisma.movimientoStock.create({
    data: {
      materialId: cuerpo.data.materialId,
      tipo: cuerpo.data.tipo,
      cantidad: cuerpo.data.cantidad,
      fecha: parsearFecha(cuerpo.data.fecha ?? null) ?? new Date(),
      nota: cuerpo.data.nota?.trim() || null,
    },
  });

  return NextResponse.json(movimiento, { status: 201 });
}

const StockInicial = z.object({
  materialId: z.string().min(1).max(40),
  stockInicial: z.number().min(0).max(1_000_000),
});

/**
 * PATCH /api/stock — fija el stock inicial de un material.
 *
 * Reemplaza el valor anterior en vez de sumarse: el inicial es el punto de
 * partida del conteo, no un movimiento.
 */
export async function PATCH(request: Request) {
  const sesion = await rolDeApi("ENCARGADO");
  if (!sesion.ok) return sesion.respuesta;

  const cuerpo = StockInicial.safeParse(await request.json().catch(() => null));
  if (!cuerpo.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", detalle: cuerpo.error.issues },
      { status: 400 },
    );
  }

  try {
    const material = await prisma.material.update({
      where: { id: cuerpo.data.materialId },
      data: { stockInicial: cuerpo.data.stockInicial },
    });
    return NextResponse.json(material);
  } catch {
    return NextResponse.json({ error: "No existe el material." }, { status: 404 });
  }
}

const BorrarMovimiento = z.object({ id: z.string().min(1).max(40) });

/** DELETE /api/stock — deshace un movimiento cargado por error. */
export async function DELETE(request: Request) {
  const sesion = await rolDeApi("ENCARGADO");
  if (!sesion.ok) return sesion.respuesta;

  const cuerpo = BorrarMovimiento.safeParse(await request.json().catch(() => null));
  if (!cuerpo.success) {
    return NextResponse.json({ error: "Falta el id." }, { status: 400 });
  }

  try {
    await prisma.movimientoStock.delete({ where: { id: cuerpo.data.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No existe el movimiento." }, { status: 404 });
  }
}
