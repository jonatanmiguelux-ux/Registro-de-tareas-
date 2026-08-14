import { prisma } from "@/lib/prisma";
import { construirLibro } from "@/lib/excel";
import { listarMateriales } from "@/lib/materiales";
import { parsearFecha } from "@/lib/fechas";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";

/**
 * GET /api/export — descarga el .xlsx.
 *
 * Filtros opcionales por query string:
 *   desde=AAAA-MM-DD   hasta=AAAA-MM-DD   planillaId=...
 *   soloConfirmadas=1  (excluye lo que todavía está en revisión)
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const desde = parsearFecha(url.searchParams.get("desde"));
  const hasta = parsearFecha(url.searchParams.get("hasta"));
  const planillaId = url.searchParams.get("planillaId");
  const soloConfirmadas = url.searchParams.get("soloConfirmadas") === "1";

  const where: Prisma.ReclamoWhereInput = {};

  if (desde || hasta) {
    where.fecha = {
      ...(desde ? { gte: desde } : {}),
      // El "hasta" es inclusivo: quien pide hasta el 31 espera ver el 31.
      ...(hasta ? { lte: new Date(hasta.getTime() + 86_399_999) } : {}),
    };
  }
  if (planillaId) where.planillaId = planillaId;
  if (soloConfirmadas) where.planilla = { estado: "CONFIRMADA" };

  const [reclamos, materiales] = await Promise.all([
    prisma.reclamo.findMany({
      where,
      orderBy: [{ fecha: "asc" }, { planillaId: "asc" }, { orden: "asc" }],
      include: { materiales: true, planilla: true },
    }),
    listarMateriales(),
  ]);

  const libro = await construirLibro(reclamos, materiales);
  const sello = new Date().toISOString().slice(0, 10);

  return new Response(new Uint8Array(libro), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="registro-de-tareas-${sello}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
