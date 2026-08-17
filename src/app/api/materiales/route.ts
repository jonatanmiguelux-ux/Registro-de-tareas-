import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clave, listarMateriales } from "@/lib/materiales";
import { usuarioDeApi, rolDeApi } from "@/lib/sesion";

export const runtime = "nodejs";

/** GET /api/materiales — catálogo de columnas de materiales. */
export async function GET() {
  const sesion = await usuarioDeApi();
  if (!sesion.ok) return sesion.respuesta;

  return NextResponse.json(await listarMateriales());
}

// El tope no es capricho: sin él, una cuenta con permiso podía crear un
// material con un nombre de miles de caracteres, que engorda la base y rompe
// las tablas donde se muestra. 120 sobra para "Lámpara sodio 250W".
const NuevoMaterial = z.object({
  nombre: z.string().min(1).max(120),
  unidad: z.string().max(40).nullable().optional(),
});

/** POST /api/materiales — alta manual de una columna que la IA no leyó. */
export async function POST(request: Request) {
  const sesion = await rolDeApi("ENCARGADO");
  if (!sesion.ok) return sesion.respuesta;

  const cuerpo = NuevoMaterial.safeParse(await request.json().catch(() => null));
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
