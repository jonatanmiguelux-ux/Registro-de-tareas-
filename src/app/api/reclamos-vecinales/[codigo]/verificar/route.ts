import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashearCodigo, INTENTOS_MAXIMOS } from "@/lib/reclamos-vecinales";

export const runtime = "nodejs";

/**
 * POST /api/reclamos-vecinales/:codigo/verificar — el vecino confirma su
 * correo con el código de seis dígitos.
 *
 * Recién acá el reclamo pasa a estar RECIBIDO y aparece en la lista del
 * municipio. Antes de eso no cuenta: es lo que evita que alguien cargue cien
 * reclamos falsos con correos inventados.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ codigo: string }> },
) {
  const { codigo } = await params;
  const cuerpo = await request.json().catch(() => null);
  const ingresado = String(cuerpo?.codigo ?? "").trim();

  if (!/^\d{6}$/.test(ingresado)) {
    return NextResponse.json(
      { error: "El código son seis números." },
      { status: 400 },
    );
  }

  const reclamo = await prisma.reclamoVecinal.findUnique({
    where: { codigo: codigo.toUpperCase() },
    select: {
      id: true,
      estado: true,
      verificacionHash: true,
      verificacionExpira: true,
      verificacionIntentos: true,
    },
  });

  if (!reclamo) {
    return NextResponse.json(
      { error: "No encontramos ese reclamo." },
      { status: 404 },
    );
  }

  if (reclamo.estado !== "SIN_VERIFICAR") {
    // Ya estaba confirmado: no es un error, es que tocó dos veces.
    return NextResponse.json({ ok: true, yaEstaba: true });
  }

  if (reclamo.verificacionIntentos >= INTENTOS_MAXIMOS) {
    return NextResponse.json(
      {
        error:
          "Se agotaron los intentos. Cargá el reclamo de nuevo para recibir otro código.",
      },
      { status: 429 },
    );
  }

  if (
    !reclamo.verificacionExpira ||
    reclamo.verificacionExpira.getTime() < Date.now()
  ) {
    return NextResponse.json(
      {
        error:
          "El código venció. Cargá el reclamo de nuevo para recibir uno nuevo.",
      },
      { status: 410 },
    );
  }

  if (reclamo.verificacionHash !== hashearCodigo(ingresado)) {
    // El intento se cuenta aunque falle, que es justamente para lo que sirve.
    await prisma.reclamoVecinal.update({
      where: { id: reclamo.id },
      data: { verificacionIntentos: { increment: 1 } },
    });
    const quedan = INTENTOS_MAXIMOS - reclamo.verificacionIntentos - 1;
    return NextResponse.json(
      {
        error:
          quedan > 0
            ? `El código no coincide. Te ${quedan === 1 ? "queda 1 intento" : `quedan ${quedan} intentos`}.`
            : "El código no coincide y se agotaron los intentos.",
      },
      { status: 400 },
    );
  }

  await prisma.reclamoVecinal.update({
    where: { id: reclamo.id },
    data: {
      estado: "RECIBIDO",
      verificadoEn: new Date(),
      // El código ya cumplió: no tiene por qué seguir guardado.
      verificacionHash: null,
      verificacionExpira: null,
    },
  });

  return NextResponse.json({ ok: true });
}
