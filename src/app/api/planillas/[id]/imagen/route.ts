import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { leerImagen } from "@/lib/almacenamiento";

export const runtime = "nodejs";

/** Sirve la foto original, para poder revisar los datos contra el papel. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const planilla = await prisma.planilla.findUnique({
    where: { id },
    select: { archivoRuta: true, archivoTipo: true },
  });

  if (!planilla) {
    return NextResponse.json({ error: "No existe la planilla." }, { status: 404 });
  }

  try {
    const bytes = await leerImagen(planilla.archivoRuta);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": planilla.archivoTipo,
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "No se encontró el archivo de la foto." },
      { status: 404 },
    );
  }
}
