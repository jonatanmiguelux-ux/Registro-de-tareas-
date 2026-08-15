import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { leerImagen } from "@/lib/almacenamiento";
import { detectarTipoImagen } from "@/lib/imagenes";
import { usuarioDeApi } from "@/lib/sesion";

export const runtime = "nodejs";

/** Sirve la foto original, para poder revisar los datos contra el papel. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const sesion = await usuarioDeApi();
  if (!sesion.ok) return sesion.respuesta;

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

    // El tipo se decide por el contenido del archivo, no por lo guardado en
    // la base: las filas cargadas antes de que existiera la verificación
    // guardaron lo que declaró el navegador, y de ahí sale esta cabecera.
    const tipo = detectarTipoImagen(bytes) ?? "application/octet-stream";

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": tipo,
        // Que el navegador la muestre y nunca la ejecute ni la trate como
        // otra cosa, aunque el tipo fuera el equivocado.
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
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
