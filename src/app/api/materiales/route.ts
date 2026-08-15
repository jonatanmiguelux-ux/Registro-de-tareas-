import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clave, listarMateriales } from "@/lib/materiales";
import { usuarioDeApi, administradorDeApi } from "@/lib/sesion";

export const runtime = "nodejs";

/** GET /api/materiales — catálogo de columnas de materiales. */
export async function GET() {
  const sesion = await usuarioDeApi();
  if (!sesion.ok) return sesion.respuesta;

  return NextResponse.json(await listarMateriales());
}

const NuevoMaterial = z.object({
  nombre: z.string().min(1),
  unidad: z.string().nullable().optional(),
});

/** POST /api/materiales — alta manual de una columna que la IA no leyó. */
export async function POST(request: Request) {
  const sesion = await administradorDeApi();
  if (!sesion.ok) return sesion.respuesta;

  const cuerpo = NuevoMaterial.safeParse(await request.json());
  if (!cuerpo.success) {
    return NextResponse.json({ error: "Nombre inválido." }, { status: 400 });
  }

  const nombre = cuerpo.data.nombre.trim();
  const existentes = await listarMateriales();
  const duplicado = existentes.find((m) => clave(m.nombre) === clave(nombre));
  if (duplicado) {
    return NextResponse.json(duplicado);
  }

  const orden = existentes.reduce((max, m) => Math.max(max, m.orden), 0) + 1;
  const creado = await prisma.material.create({
    data: { nombre, unidad: cuerpo.data.unidad ?? null, orden },
  });

  return NextResponse.json(creado, { status: 201 });
}
