import { prisma } from "@/lib/prisma";
import { construirLibro } from "@/lib/excel";
import { listarMateriales } from "@/lib/materiales";
import { consumoPorMaterial } from "@/lib/consultas";
import { leerFiltros, whereReclamo } from "@/lib/filtros";

export const runtime = "nodejs";

/**
 * GET /api/export — descarga el .xlsx.
 *
 * Acepta los mismos filtros que las pantallas (`desde`, `hasta`, `cuadrilla`,
 * `estado`, `incidente`), así lo que baja es exactamente lo que la persona
 * está viendo. Para un solo día, mandar `desde` y `hasta` iguales.
 *
 * Se mantienen `planillaId` y `soloConfirmadas` por compatibilidad con los
 * links de la versión anterior.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const filtros = leerFiltros(url.searchParams);
  const where = whereReclamo(filtros);

  const planillaId = url.searchParams.get("planillaId");
  if (planillaId) where.planillaId = planillaId;

  // Alias viejo de `estado=CONFIRMADA`. Si vienen los dos, gana este.
  if (url.searchParams.get("soloConfirmadas") === "1") {
    where.planilla = { estado: "CONFIRMADA" };
  }

  const [reclamos, materiales, consumo] = await Promise.all([
    prisma.reclamo.findMany({
      where,
      orderBy: [{ fecha: "asc" }, { planillaId: "asc" }, { orden: "asc" }],
      include: { materiales: true, planilla: true },
    }),
    listarMateriales(),
    consumoPorMaterial(filtros),
  ]);

  const libro = await construirLibro(reclamos, materiales, consumo);

  const sello =
    filtros.desde && filtros.hasta
      ? filtros.desde.getTime() === filtros.hasta.getTime()
        ? filtros.desde.toISOString().slice(0, 10)
        : `${filtros.desde.toISOString().slice(0, 10)}_a_${filtros.hasta.toISOString().slice(0, 10)}`
      : new Date().toISOString().slice(0, 10);

  return new Response(new Uint8Array(libro), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="registro-de-tareas-${sello}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
