import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { usuarioDeApi } from "@/lib/sesion";

export const runtime = "nodejs";

const Cambios = z.object({
  /** El número que devolvió el sistema oficial al cargarlo ahí. */
  nroIncidente: z.string().trim().max(40).optional(),
  descartar: z.boolean().optional(),
  notaInterna: z.string().trim().max(500).nullable().optional(),
});

/**
 * PATCH /api/reclamos-vecinales/:codigo — lo usa el municipio, no el vecino.
 *
 * Esta ruta está bajo la misma carpeta que las públicas, así que **exige
 * sesión de forma explícita**: la lista de rutas públicas del middleware
 * incluye `/api/reclamos-vecinales` para dejar pasar la carga del vecino, y
 * sin este control quedaría abierta también la edición.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ codigo: string }> },
) {
  const sesion = await usuarioDeApi();
  if (!sesion.ok) return sesion.respuesta;

  const { codigo } = await params;
  const cuerpo = Cambios.safeParse(await request.json().catch(() => null));
  if (!cuerpo.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const reclamo = await prisma.reclamoVecinal.findUnique({
    where: { codigo: codigo.toUpperCase() },
    select: { id: true, estado: true },
  });

  if (!reclamo) {
    return NextResponse.json({ error: "No existe el reclamo." }, { status: 404 });
  }

  if (reclamo.estado === "SIN_VERIFICAR") {
    return NextResponse.json(
      {
        error:
          "El vecino todavía no confirmó su correo. Hasta entonces el reclamo no se puede derivar.",
      },
      { status: 409 },
    );
  }

  const { nroIncidente, descartar, notaInterna } = cuerpo.data;

  await prisma.reclamoVecinal.update({
    where: { id: reclamo.id },
    data: {
      ...(notaInterna !== undefined ? { notaInterna } : {}),
      ...(descartar ? { estado: "DESCARTADO" } : {}),
      ...(nroIncidente
        ? {
            nroIncidente,
            estado: "DERIVADO",
            derivadoEn: new Date(),
            derivadoPor: sesion.usuario.email ?? sesion.usuario.id,
          }
        : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
