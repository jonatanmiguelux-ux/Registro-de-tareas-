import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatearFecha, formatearMomento } from "@/lib/fechas";
import { Exportar } from "@/components/Exportar";
import { BorrarPlanilla } from "@/components/BorrarPlanilla";

export const dynamic = "force-dynamic";

const ETIQUETAS: Record<string, { texto: string; clase: string }> = {
  PROCESANDO: { texto: "Procesando", clase: "bg-slate-100 text-slate-700" },
  EN_REVISION: { texto: "En revisión", clase: "bg-amber-100 text-amber-800" },
  CONFIRMADA: { texto: "Confirmada", clase: "bg-green-100 text-green-800" },
  ERROR: { texto: "Error", clase: "bg-red-100 text-red-800" },
};

export default async function PaginaRegistros() {
  const [planillas, totalReclamos, totalMateriales] = await Promise.all([
    prisma.planilla.findMany({
      orderBy: { creadoEn: "desc" },
      include: { _count: { select: { reclamos: true } } },
    }),
    prisma.reclamo.count(),
    prisma.material.count(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Registros</h1>
        <p className="mt-1 text-sm text-slate-600">
          {planillas.length} planilla{planillas.length === 1 ? "" : "s"} ·{" "}
          {totalReclamos} reclamo{totalReclamos === 1 ? "" : "s"} ·{" "}
          {totalMateriales} material{totalMateriales === 1 ? "" : "es"} en el
          catálogo
        </p>
      </div>

      <Exportar />

      {planillas.length === 0 ? (
        <div className="tarjeta px-4 py-10 text-center">
          <p className="text-sm text-slate-600">
            Todavía no cargaste ninguna planilla.
          </p>
          <Link href="/" className="boton-primario mt-4">
            Cargar la primera
          </Link>
        </div>
      ) : (
        <div className="tarjeta divide-y divide-[var(--color-borde)]">
          {planillas.map((planilla) => {
            const etiqueta = ETIQUETAS[planilla.estado] ?? ETIQUETAS.PROCESANDO;
            return (
              <div
                key={planilla.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {planilla.archivoNombre}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${etiqueta.clase}`}
                    >
                      {etiqueta.texto}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {planilla._count.reclamos} reclamo
                    {planilla._count.reclamos === 1 ? "" : "s"}
                    {planilla.fecha && ` · planilla del ${formatearFecha(planilla.fecha)}`}
                    {" · cargada el "}
                    {formatearMomento(planilla.creadoEn)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/revisar/${planilla.id}`}
                    className="boton-secundario px-3 py-2"
                  >
                    {planilla.estado === "CONFIRMADA" ? "Ver" : "Revisar"}
                  </Link>
                  <BorrarPlanilla id={planilla.id} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
