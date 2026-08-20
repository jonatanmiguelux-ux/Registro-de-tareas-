import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rolDeApi } from "@/lib/sesion";
import { generarTokenAcceso } from "@/lib/dispositivo";

export const runtime = "nodejs";

const Cuerpo = z.object({
  numero: z.number().int().positive().max(99),
  // "generar": crea o regenera el código (y desactiva el enlace anterior).
  // "quitar": borra el acceso; el celular deja de entrar.
  accion: z.enum(["generar", "quitar"]),
});

/**
 * POST /api/cuadrillas/acceso — administra el acceso desde el celular de una
 * cuadrilla.
 *
 * Es sólo del administrador: un enlace de acceso es una llave, y quién tiene
 * llave de qué no es una decisión de todos los días como repartir localidades.
 *
 * Regenerar cambia el código, así que el enlace anterior —y el celular que lo
 * tenía— dejan de entrar. Es la forma de desactivar un teléfono perdido.
 */
export async function POST(request: Request) {
  const sesion = await rolDeApi("ADMINISTRADOR");
  if (!sesion.ok) return sesion.respuesta;

  const cuerpo = Cuerpo.safeParse(await request.json().catch(() => null));
  if (!cuerpo.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const cuadrilla = await prisma.cuadrilla.findUnique({
    where: { numero: cuerpo.data.numero },
  });
  if (!cuadrilla) {
    return NextResponse.json({ error: "No existe la cuadrilla." }, { status: 404 });
  }

  await prisma.cuadrilla.update({
    where: { numero: cuerpo.data.numero },
    data: {
      tokenAcceso:
        cuerpo.data.accion === "generar" ? generarTokenAcceso() : null,
    },
  });

  return NextResponse.json({ ok: true });
}
