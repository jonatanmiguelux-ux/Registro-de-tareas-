import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { usuarioDeApi, rolDeApi } from "@/lib/sesion";
import { borrarImagen } from "@/lib/almacenamiento";
import { avisarReclamoRealizado } from "@/lib/notificaciones-vecino";

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
    select: {
      id: true,
      estado: true,
      contacto: true,
      codigo: true,
      calle: true,
      numero: true,
      localidad: true,
    },
  });

  if (!reclamo) {
    return NextResponse.json({ error: "No existe el reclamo." }, { status: 404 });
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

  // El aviso al vecino sale sólo cuando el reclamo **pasa** a derivado, no en
  // cada guardado: si ya estaba derivado y sólo se toca una nota, no se le
  // manda un correo de más.
  if (nroIncidente && reclamo.estado !== "DERIVADO") {
    await avisarReclamoRealizado({ ...reclamo, nroIncidente });
  }

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/reclamos-vecinales/:codigo — borra un reclamo de vecino de verdad.
 *
 * Sólo el administrador. Distinto de "Descartar", que lo oculta pero lo
 * conserva: esto lo saca de la base junto con su foto, sin vuelta atrás. Es
 * para limpiar una prueba, un duplicado o algo cargado por error.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ codigo: string }> },
) {
  const sesion = await rolDeApi("ADMINISTRADOR");
  if (!sesion.ok) return sesion.respuesta;

  const { codigo } = await params;
  const reclamo = await prisma.reclamoVecinal.findUnique({
    where: { codigo: codigo.toUpperCase() },
    select: { id: true, fotoRuta: true },
  });

  if (!reclamo) {
    return NextResponse.json({ error: "No existe el reclamo." }, { status: 404 });
  }

  await prisma.reclamoVecinal.delete({ where: { id: reclamo.id } });
  await borrarImagen(reclamo.fotoRuta);

  return NextResponse.json({ ok: true });
}
