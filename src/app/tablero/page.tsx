import Link from "next/link";
import { formatearFecha } from "@/lib/fechas";
import { leerFiltros, hayFiltros, aQueryString } from "@/lib/filtros";
import {
  totales,
  consumoPorMaterial,
  resumenDiario,
  cuadrillas,
} from "@/lib/consultas";
import { BarraFiltros } from "@/components/BarraFiltros";
import { BotonExportar } from "@/components/BotonExportar";

export const dynamic = "force-dynamic";

export default async function PaginaTablero({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filtros = leerFiltros(await searchParams);
  const query = aQueryString(filtros);

  const [kpis, consumo, dias, listaCuadrillas] = await Promise.all([
    totales(filtros),
    consumoPorMaterial(filtros),
    resumenDiario(filtros),
    cuadrillas(),
  ]);

  const maxConsumo = consumo[0]?.cantidad ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tablero</h1>
          <p className="mt-1 text-sm text-slate-600">
            {hayFiltros(filtros)
              ? "Sobre el período y los filtros seleccionados."
              : "Sobre todo el histórico. Filtrá para acotar el período."}
          </p>
        </div>
        <BotonExportar query={query} />
      </div>

      <BarraFiltros cuadrillas={listaCuadrillas} conIncidente={false} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tarjeta titulo="Reclamos" valor={kpis.reclamos} detalle={`en ${kpis.planillas} planilla${kpis.planillas === 1 ? "" : "s"}`} />
        <Tarjeta
          titulo="Pendientes"
          valor={kpis.pendientes}
          detalle="en planillas sin confirmar"
          alerta={kpis.pendientes > 0}
        />
        <Tarjeta
          titulo="Materiales usados"
          valor={kpis.materialesUsados}
          detalle={`${consumo.length} tipo${consumo.length === 1 ? "" : "s"} distinto${consumo.length === 1 ? "" : "s"}`}
        />
        <Tarjeta
          titulo="Lecturas dudosas"
          valor={kpis.dudosos}
          detalle="sin revisar todavía"
          alerta={kpis.dudosos > 0}
        />
      </div>

      <section className="tarjeta overflow-hidden">
        <h2 className="border-b border-[var(--color-borde)] px-4 py-3 text-sm font-semibold">
          Consumo por tipo de material
        </h2>
        {consumo.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-600">
            No hay materiales cargados en este período.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--color-borde)]">
            {consumo.map((m) => (
              <li key={m.materialId} className="px-4 py-2.5">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">
                    {m.nombre}
                    {m.grupo && (
                      <span className="ml-2 text-xs text-slate-500">{m.grupo}</span>
                    )}
                  </span>
                  <span className="shrink-0 font-medium tabular-nums">
                    {m.cantidad}
                    {m.unidad && <span className="ml-1 text-xs font-normal text-slate-500">{m.unidad}</span>}
                  </span>
                </div>
                {/* Barra proporcional al material más usado: da la magnitud
                    relativa de un vistazo, sin necesidad de un gráfico. */}
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[var(--color-acento)]"
                    style={{
                      width: `${maxConsumo > 0 ? (m.cantidad / maxConsumo) * 100 : 0}%`,
                    }}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  en {m.reclamos} reclamo{m.reclamos === 1 ? "" : "s"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="tarjeta overflow-hidden">
        <h2 className="border-b border-[var(--color-borde)] px-4 py-3 text-sm font-semibold">
          Resumen diario
        </h2>
        {dias.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-600">
            No hay reclamos en este período.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm">
              <thead>
                <tr className="border-b border-[var(--color-borde)] text-left text-xs font-medium text-slate-600">
                  <th className="px-4 py-2">Día</th>
                  <th className="px-4 py-2 text-right">Reclamos</th>
                  <th className="px-4 py-2 text-right">Materiales</th>
                  <th className="px-4 py-2">Cuadrillas</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-borde)]">
                {dias.map((d) => (
                  <tr key={d.fecha}>
                    <td className="px-4 py-2 font-medium">
                      {d.fecha === "sin-fecha" ? "Sin fecha" : formatearFecha(d.fecha)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{d.reclamos}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{d.materiales}</td>
                    <td className="px-4 py-2 text-slate-600">
                      {d.cuadrillas.length > 0
                        ? d.cuadrillas.map((c) => `Móvil ${c}`).join(", ")
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {d.fecha !== "sin-fecha" && (
                        <a
                          href={`/api/export?desde=${d.fecha}&hasta=${d.fecha}`}
                          className="text-xs text-[var(--color-acento)] hover:underline"
                        >
                          Excel del día
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {kpis.pendientes > 0 && (
        <p className="text-sm text-slate-600">
          Hay {kpis.pendientes} reclamo{kpis.pendientes === 1 ? "" : "s"} en
          planillas sin confirmar.{" "}
          <Link
            href="/registros?estado=EN_REVISION"
            className="text-[var(--color-acento)] hover:underline"
          >
            Ver las planillas en revisión
          </Link>
        </p>
      )}
    </div>
  );
}

function Tarjeta({
  titulo,
  valor,
  detalle,
  alerta = false,
}: {
  titulo: string;
  valor: number;
  detalle: string;
  alerta?: boolean;
}) {
  return (
    <div className={`tarjeta p-4 ${alerta ? "border-amber-300 bg-amber-50/50" : ""}`}>
      <p className="text-xs font-medium text-slate-600">{titulo}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">
        {Number.isInteger(valor) ? valor : valor.toFixed(1)}
      </p>
      <p className="mt-1 text-xs text-slate-500">{detalle}</p>
    </div>
  );
}
