import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { dispositivoActual } from "@/lib/dispositivo";

export const runtime = "nodejs";

const Cuerpo = z.object({
  codigo: z.string().min(1).max(20),
  nroIncidente: z.string().trim().min(1).max(40),
});

/**
 * POST /api/dispositivo/incidente — el celular de una cuadrilla le anota el
 * N.º de incidente a un reclamo de su zona.
 *
 * Es lo único que puede hacer un celular de cuadrilla. Tres candados, porque a
 * esta dirección se le puede escribir la petición a mano:
 *
 * 1. Sólo entra un dispositivo activado (galleta válida contra la base).
 * 2. El reclamo tiene que ser **de la cuadrilla de ese celular**: así el de la
 *    cuadrilla 1 no puede tocar un reclamo de la 2 mandando otro código.
 * 3. Sólo se cambia el N.º de incidente y el estado a DERIVADO. Nada más.
 */
export async function POST(request: Request) {
  const dispositivo = await dispositivoActual();
  if (!dispositivo) {
    return NextResponse.json(
      { error: "Este celular no está activado." },
      { status: 401 },
    );
  }

  const cuerpo = Cuerpo.safeParse(await request.json().catch(() => null));
  if (!cuerpo.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const reclamo = await prisma.reclamoVecinal.findUnique({
    where: { codigo: cuerpo.data.codigo.toUpperCase() },
    select: { cuadrilla: true },
  });

  // Que exista y que sea de la cuadrilla de este celular. Si no, se responde
  // "no existe" y no "no podés": no hay que confirmarle a un celular que un
  // reclamo de otra zona existe.
  if (!reclamo || reclamo.cuadrilla !== dispositivo.cuadrilla) {
    return NextResponse.json(
      { error: "Ese reclamo no es de tu cuadrilla." },
      { status: 404 },
    );
  }

  await prisma.reclamoVecinal.update({
    where: { codigo: cuerpo.data.codigo.toUpperCase() },
    data: {
      nroIncidente: cuerpo.data.nroIncidente,
      estado: "DERIVADO",
      derivadoEn: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
