import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rolDeApi } from "@/lib/sesion";

export const runtime = "nodejs";

/**
 * DELETE /api/reclamos/:id — borra una fila de una planilla.
 *
 * Sólo el administrador. Es para sacar una fila que la IA leyó de más o
 * repetida, sin tener que rehacer toda la planilla. Al borrar el reclamo se
 * van solos sus materiales (la base los borra en cascada), así que no queda
 * consumo colgado descontando stock de la nada.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const sesion = await rolDeApi("ADMINISTRADOR");
  if (!sesion.ok) return sesion.respuesta;

  const { id } = await params;

  try {
    await prisma.reclamo.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "No existe el reclamo." },
      { status: 404 },
    );
  }
}
