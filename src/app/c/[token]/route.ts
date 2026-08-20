import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fijarDispositivo } from "@/lib/dispositivo";

export const runtime = "nodejs";

/**
 * GET /c/:token — activa un celular como el de una cuadrilla.
 *
 * Es el enlace que el administrador abre una vez en el teléfono del equipo. Si
 * el código es válido, deja la galleta que fija ese celular a la cuadrilla y lo
 * manda a su pantalla; de ahí en más el teléfono entra directo. Si el código no
 * existe (fue regenerado, o el enlace está mal), no fija nada y avisa.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const cuadrilla = await prisma.cuadrilla.findUnique({
    where: { tokenAcceso: token },
    select: { numero: true },
  });

  // El dominio real, del proxy (x-forwarded-host) o del propio pedido. No se
  // usa AUTH_URL porque en producción no está: la app atiende dos dominios.
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto =
    req.headers.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") ? "http" : "https");
  const origen = host ? `${proto}://${host}` : new URL(req.url).origin;

  const destino = cuadrilla ? "/cuadrilla" : "/cuadrilla?error=enlace";

  if (cuadrilla) await fijarDispositivo(token);

  return NextResponse.redirect(new URL(destino, origen), { status: 303 });
}
