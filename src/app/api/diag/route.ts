import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { auth } from "@/auth";

export const runtime = "nodejs";

/**
 * GET /api/diag — diagnóstico de sesión, temporal. SIN autenticación.
 *
 * No revela ningún secreto: sólo los NOMBRES de las galletas presentes, el host
 * que ve el servidor, y si la sesión se lee (el correo propio, o null). Sirve
 * para entender por qué una sesión no se reconoce. Se saca cuando se resuelve.
 */
export async function GET() {
  const galletas = await cookies();
  const cab = await headers();

  const nombres = galletas.getAll().map((c) => c.name);
  const tieneSesion = nombres.some((n) => n.includes("authjs.session-token"));

  let usuario: string | null = null;
  try {
    const s = await auth();
    usuario = s?.user?.email ?? null;
  } catch (e) {
    usuario = "ERROR: " + (e instanceof Error ? e.message : String(e));
  }

  return NextResponse.json({
    host: cab.get("host"),
    xForwardedHost: cab.get("x-forwarded-host"),
    xForwardedProto: cab.get("x-forwarded-proto"),
    galletasPresentes: nombres,
    tieneGalletaSesion: tieneSesion,
    authReconoce: usuario,
  });
}
