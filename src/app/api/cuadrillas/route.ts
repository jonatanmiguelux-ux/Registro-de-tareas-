import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rolDeApi } from "@/lib/sesion";
import { normalizarLocalidad } from "@/lib/localidades";
import { listarCuadrillas } from "@/lib/cuadrillas-db";

export const runtime = "nodejs";

/** GET /api/cuadrillas — el reparto actual. */
export async function GET() {
  const sesion = await rolDeApi("ENCARGADO");
  if (!sesion.ok) return sesion.respuesta;
  return NextResponse.json(await listarCuadrillas());
}

const Asignacion = z.object({
  localidad: z.string().trim().min(1).max(80),
  /** null saca la localidad de toda cuadrilla. */
  numero: z.number().int().positive().nullable(),
});

/**
 * PATCH /api/cuadrillas — mueve una localidad de una cuadrilla a otra.
 *
 * Se trabaja de a una localidad, no reemplazando listas enteras: dos personas
 * editando al mismo tiempo se pisarían el reparto completo, mientras que así
 * lo peor que puede pasar es que una localidad quede donde la dejó la última.
 *
 * La localidad se saca de cualquier otra cuadrilla antes de asignarla, así que
 * **nunca puede estar en dos a la vez**: eso mandaría dos equipos al mismo
 * poste.
 */
export async function PATCH(request: Request) {
  const sesion = await rolDeApi("ENCARGADO");
  if (!sesion.ok) return sesion.respuesta;

  const cuerpo = Asignacion.safeParse(await request.json().catch(() => null));
  if (!cuerpo.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  // Se guarda con el nombre completo, igual que en el resto del sistema.
  const localidad = normalizarLocalidad(cuerpo.data.localidad);
  if (!localidad) {
    return NextResponse.json({ error: "Falta la localidad." }, { status: 400 });
  }

  const { numero } = cuerpo.data;

  await prisma.$transaction(async (tx) => {
    const todas = await tx.cuadrilla.findMany({
      select: { id: true, numero: true, localidades: true },
    });

    for (const c of todas) {
      const tenia = c.localidades.includes(localidad);
      const deberia = c.numero === numero;
      if (tenia === deberia) continue;

      await tx.cuadrilla.update({
        where: { id: c.id },
        data: {
          localidades: deberia
            ? [...c.localidades, localidad]
            : c.localidades.filter((l) => l !== localidad),
        },
      });
    }
  });

  return NextResponse.json({ ok: true });
}

const NuevaCuadrilla = z.object({ numero: z.number().int().positive().max(99) });

/** POST /api/cuadrillas — da de alta una cuadrilla vacía. */
export async function POST(request: Request) {
  const sesion = await rolDeApi("ENCARGADO");
  if (!sesion.ok) return sesion.respuesta;

  const cuerpo = NuevaCuadrilla.safeParse(await request.json().catch(() => null));
  if (!cuerpo.success) {
    return NextResponse.json(
      { error: "El número de cuadrilla tiene que ser un entero entre 1 y 99." },
      { status: 400 },
    );
  }

  const existe = await prisma.cuadrilla.findUnique({
    where: { numero: cuerpo.data.numero },
  });
  if (existe) {
    return NextResponse.json(
      { error: `Ya existe la cuadrilla ${cuerpo.data.numero}.` },
      { status: 409 },
    );
  }

  await prisma.cuadrilla.create({
    data: { numero: cuerpo.data.numero, localidades: [] },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

/** DELETE /api/cuadrillas?numero=N — da de baja una cuadrilla sin localidades. */
export async function DELETE(request: Request) {
  const sesion = await rolDeApi("ENCARGADO");
  if (!sesion.ok) return sesion.respuesta;

  const numero = Number(new URL(request.url).searchParams.get("numero"));
  if (!Number.isInteger(numero)) {
    return NextResponse.json({ error: "Falta el número." }, { status: 400 });
  }

  const cuadrilla = await prisma.cuadrilla.findUnique({ where: { numero } });
  if (!cuadrilla) {
    return NextResponse.json({ error: "No existe." }, { status: 404 });
  }

  // Con localidades encima, borrarla dejaría esos lugares sin nadie y sin
  // aviso. Primero hay que repartirlas.
  if (cuadrilla.localidades.length > 0) {
    return NextResponse.json(
      {
        error: `La cuadrilla ${numero} todavía cubre ${cuadrilla.localidades.length} localidad${cuadrilla.localidades.length === 1 ? "" : "es"}. Pasalas a otra antes de darla de baja.`,
      },
      { status: 409 },
    );
  }

  await prisma.cuadrilla.delete({ where: { numero } });
  return NextResponse.json({ ok: true });
}
