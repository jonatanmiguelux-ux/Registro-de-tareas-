import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { leerImagen } from "@/lib/almacenamiento";
import { detectarTipoImagen } from "@/lib/imagenes";
import { usuarioDeApi } from "@/lib/sesion";

export const runtime = "nodejs";

/**
 * GET /api/reclamos-vecinales/:codigo/foto — la foto que sacó el vecino.
 *
 * **Exige sesión.** Está bajo una carpeta que el middleware deja pasar para
 * que el vecino pueda cargar su reclamo, así que el control se hace acá: sin
 * esto, cualquiera con un código de seguimiento podría mirar fotos de casas
 * ajenas, y esos códigos circulan por correo.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ codigo: string }> },
) {
  const sesion = await usuarioDeApi();
  if (!sesion.ok) return sesion.respuesta;

  const { codigo } = await params;
  const reclamo = await prisma.reclamoVecinal.findUnique({
    where: { codigo: codigo.toUpperCase() },
    select: { fotoRuta: true },
  });

  if (!reclamo) {
    return NextResponse.json({ error: "No existe el reclamo." }, { status: 404 });
  }

  try {
    const bytes = await leerImagen(reclamo.fotoRuta);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": detectarTipoImagen(bytes) ?? "application/octet-stream",
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
