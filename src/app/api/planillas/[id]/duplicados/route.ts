import { NextResponse } from "next/server";
import { detectarDuplicados } from "@/lib/duplicados";
import { usuarioDeApi } from "@/lib/sesion";

export const runtime = "nodejs";

/**
 * GET /api/planillas/:id/duplicados — posibles cargas repetidas.
 *
 * La revisión lo consulta de nuevo justo antes de confirmar, porque el
 * corrector pudo haber tipeado un N.º de incidente que recién ahí choca con
 * uno ya cargado.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const sesion = await usuarioDeApi();
  if (!sesion.ok) return sesion.respuesta;

  const { id } = await params;
  return NextResponse.json(await detectarDuplicados(id));
}
