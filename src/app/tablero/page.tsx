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
import { requerirUsuario } from "@/lib/sesion";
import {
  GraficoBarras,
  GraficoColumnas,
  Leyenda,
  colorDeGrupo,
} from "@/components/graficos";

export const dynamic = "force-dynamic";

/** Cuántos días entran en el gráfico sin volverse ilegible en el celular. */
const DIAS_EN_GRAFICO = 14;

export default async function PaginaTablero({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requerirUsuario();
  const filtros = leerFiltros(await searchParams);
  const query = aQueryString(filtros);

  const [kpis, consumo, dias, listaCuadrillas] = await Promise.all([
    totales(filtros),
    consumoPorMaterial(filtros),
    resumenDiario(filtros),
    cuadrillas(),
  ]);

  // Los grupos que realmente aparecen, en el orden del papel.
  const grupos = [...new Set(consumo.map((m) => m.grupo ?? "Sin grupo"))];

  // El gráfico va de más viejo a más nuevo, al revés que la tabla.
  const conFecha = dias.filter((d) => d.fecha !== "sin-fecha");
  const paraGrafico = conFecha.slice(0, DIAS_EN_GRAFICO).reverse();

  const promedioDiario =
    conFecha.length > 0
      ? conFecha.reduce((t, d) => t + d.reclamos, 0) / conFecha.length
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="titulo-pagina">Tablero</h1>
          <p className="bajada mt-1.5">
            {hayFiltros(filtros)
              ? "Sobre el período y los filtros seleccionados."
              : "Sobre todo el histórico. Filtrá para acotar el período."}
          </p>
        </div>
        <BotonExportar query={query} />
      </div>

      <BarraFiltros cuadrillas={listaCuadrillas} conIncidente={false} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tarjeta
          titulo="Reclamos"
          valor={kpis.reclamos}
          detalle={`en ${kpis.planillas} planilla${kpis.planillas === 1 ? "" : "s"}`}
        />
        <Tarjeta
          titulo="Promedio por día"
          valor={promedioDiario}
          detalle={
            conFecha.length > 0
              ? `sobre ${conFecha.length} día${conFecha.length === 1 ? "" : "s"} con trabajo`
              : "todavía sin días cargados"
          }
        />
        <Tarjeta
          titulo="Materiales usados"
          valor={kpis.materialesUsados}
          detalle={`${consumo.length} tipo${consumo.length === 1 ? "" : "s"} distinto${consumo.length === 1 ? "" : "s"}`}
        />
        <Tarjeta
          titulo="Pendientes"
          valor={kpis.pendientes}
          detalle="en planillas sin confirmar"
          alerta={kpis.pendientes > 0}
          accion={
            kpis.pendientes > 0
              ? { href: "/registros?estado=EN_REVISION", texto: "Ver planillas" }
              : undefined
          }
        />
      </div>

      {kpis.dudosos > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[var(--radius-tarjeta)] border border-[var(--color-alerta-borde)] bg-[var(--color-alerta-fondo)] px-4 py-3 text-sm">
          <IconoAlerta />
          <span className="font-semibold text-[var(--color-alerta)]">
            {kpis.dudosos} fila{kpis.dudosos === 1 ? "" : "s"} que la IA leyó con
            dudas
          </span>
          <span className="text-[var(--color-tinta-2)]">
            Nadie las revisó todavía contra el papel.
          </span>
          <Link
            href="/registros?estado=EN_REVISION"
            className="ml-auto font-semibold text-[var(--color-acento)] underline underline-offset-2"
          >
            Revisarlas
          </Link>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="tarjeta overflow-hidden">
          <div className="tarjeta-titulo">
            <div>
              <h2 className="text-sm font-semibold">Reclamos por día</h2>
              <p className="mt-0.5 text-xs text-[var(--color-tinta-3)]">
                {paraGrafico.length > 0
                  ? `Últimos ${paraGrafico.length} día${paraGrafico.length === 1 ? "" : "s"} con trabajo cargado`
                  : "Sin días cargados"}
              </p>
            </div>
          </div>
          <div className="p-4">
            {paraGrafico.length === 0 ? (
              <Vacio texto="No hay reclamos con fecha en este período." />
            ) : (
              <GraficoColumnas
                datos={paraGrafico.map((d) => ({
                  clave: d.fecha,
                  etiqueta: formatearFecha(d.fecha).slice(0, 5),
                  titulo: `${formatearFecha(d.fecha)} · ${d.reclamos} reclamo${d.reclamos === 1 ? "" : "s"} · ${d.materiales} material${d.materiales === 1 ? "" : "es"}`,
                  valor: d.reclamos,
                }))}
              />
            )}
          </div>
        </section>

        <section className="tarjeta overflow-hidden">
          <div className="tarjeta-titulo">
            <div>
              <h2 className="text-sm font-semibold">Consumo por material</h2>
              <p className="mt-0.5 text-xs text-[var(--color-tinta-3)]">
                {kpis.materialesUsados} unidades en total
              </p>
            </div>
            <Leyenda grupos={grupos} />
          </div>
          <div className="p-4">
            {consumo.length === 0 ? (
              <Vacio texto="No hay materiales cargados en este período." />
            ) : (
              <GraficoBarras
                datos={consumo.map((m) => ({
                  clave: m.materialId,
                  etiqueta: m.nombre,
                  valor: m.cantidad,
                  sufijo: m.unidad ?? undefined,
                  color: colorDeGrupo(m.grupo),
                  detalle: `en ${m.reclamos} reclamo${m.reclamos === 1 ? "" : "s"}`,
                }))}
              />
            )}
          </div>
        </section>
      </div>

      <section className="tarjeta overflow-hidden">
        <div className="tarjeta-titulo">
          <h2 className="text-sm font-semibold">Detalle por día</h2>
          <p className="text-xs text-[var(--color-tinta-3)]">
            Los mismos números del gráfico, con el Excel de cada jornada
          </p>
        </div>
        {dias.length === 0 ? (
          <div className="p-4">
            <Vacio texto="No hay reclamos en este período." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-[var(--color-borde)] text-left text-xs font-semibold text-[var(--color-tinta-2)]">
                  <th className="px-4 py-2.5">Día</th>
                  <th className="px-4 py-2.5 text-right">Reclamos</th>
                  <th className="px-4 py-2.5 text-right">Materiales</th>
                  <th className="px-4 py-2.5">Cuadrillas</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-borde)]">
                {dias.map((d) => (
                  <tr key={d.fecha} className="transition hover:bg-slate-50/70">
                    <td className="px-4 py-2.5 font-medium tabular-nums">
                      {d.fecha === "sin-fecha"
                        ? "Sin fecha"
                        : formatearFecha(d.fecha)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {d.reclamos}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {d.materiales}
                    </td>
                    <td className="px-4 py-2.5 text-[var(--color-tinta-2)]">
                      {d.cuadrillas.length > 0
                        ? d.cuadrillas.map((c) => `Móvil ${c}`).join(", ")
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {d.fecha !== "sin-fecha" && (
                        <a
                          href={`/api/export?desde=${d.fecha}&hasta=${d.fecha}`}
                          className="text-xs font-semibold text-[var(--color-acento)] hover:underline"
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
    </div>
  );
}

function Tarjeta({
  titulo,
  valor,
  detalle,
  alerta = false,
  accion,
}: {
  titulo: string;
  valor: number;
  detalle: string;
  alerta?: boolean;
  accion?: { href: string; texto: string };
}) {
  return (
    <div
      className={`tarjeta flex flex-col p-4 ${
        alerta
          ? "border-[var(--color-alerta-borde)] bg-[var(--color-alerta-fondo)]"
          : ""
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-tinta-3)]">
        {titulo}
      </p>
      <p className="mt-1.5 text-[2rem] font-semibold leading-none tracking-tight">
        {Number.isInteger(valor) ? valor : valor.toFixed(1)}
      </p>
      <p className="mt-2 text-xs text-[var(--color-tinta-2)]">{detalle}</p>
      {accion && (
        <Link
          href={accion.href}
          className="mt-2 text-xs font-semibold text-[var(--color-acento)] hover:underline"
        >
          {accion.texto} →
        </Link>
      )}
    </div>
  );
}

function Vacio({ texto }: { texto: string }) {
  return (
    <p className="py-10 text-center text-sm text-[var(--color-tinta-3)]">
      {texto}
    </p>
  );
}

function IconoAlerta() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-alerta)"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M12 3.6 21.2 19.4H2.8z" strokeLinejoin="round" />
      <path d="M12 10v4M12 17h.01" />
    </svg>
  );
}
