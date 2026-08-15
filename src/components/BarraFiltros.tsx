"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { ESTADOS } from "@/lib/filtros";

/**
 * Filtros de fecha, cuadrilla, estado y N.º de incidente.
 *
 * Viven en la query string: así el estado del filtro se comparte con un link,
 * sobrevive al refresh y es lo mismo que consume el botón de exportar.
 *
 * En el celular arranca plegado y muestra sólo qué hay aplicado: cuatro campos
 * desplegados se comen la pantalla entera antes de que se vea un solo dato.
 */
export function BarraFiltros({
  cuadrillas,
  conIncidente = true,
  conEstado = true,
}: {
  cuadrillas: string[];
  conIncidente?: boolean;
  conEstado?: boolean;
}) {
  const router = useRouter();
  const ruta = usePathname();
  const params = useSearchParams();
  const [pendiente, iniciar] = useTransition();

  const [incidente, setIncidente] = useState(params.get("incidente") ?? "");

  function aplicar(cambios: Record<string, string>) {
    const nuevos = new URLSearchParams(params.toString());
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor) nuevos.set(clave, valor);
      else nuevos.delete(clave);
    }
    iniciar(() => router.push(`${ruta}?${nuevos.toString()}`));
  }

  function atajoDias(dias: number) {
    const hasta = new Date();
    const desde = new Date(hasta.getTime() - dias * 86_400_000);
    aplicar({
      desde: desde.toISOString().slice(0, 10),
      hasta: hasta.toISOString().slice(0, 10),
    });
  }

  /** ¿Está puesto justo este rango? Para marcar el atajo elegido. */
  function rangoActivo(dias: number): boolean {
    const hasta = new Date();
    const desde = new Date(hasta.getTime() - dias * 86_400_000);
    return (
      params.get("desde") === desde.toISOString().slice(0, 10) &&
      params.get("hasta") === hasta.toISOString().slice(0, 10)
    );
  }

  const puestos = [
    params.get("desde") && `desde ${params.get("desde")}`,
    params.get("hasta") && `hasta ${params.get("hasta")}`,
    params.get("cuadrilla") && `Móvil ${params.get("cuadrilla")}`,
    params.get("estado") &&
      ESTADOS.find((e) => e.valor === params.get("estado"))?.etiqueta,
    params.get("incidente") && `N.º ${params.get("incidente")}`,
  ].filter(Boolean) as string[];

  return (
    <details className="tarjeta group overflow-hidden" open={puestos.length > 0}>
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition hover:bg-slate-50/70">
        <IconoFiltro />
        <span className="text-sm font-semibold">Filtros</span>

        {puestos.length > 0 ? (
          <span className="flex min-w-0 flex-wrap items-center gap-1.5">
            {puestos.map((p) => (
              <span
                key={p}
                className="etiqueta bg-[var(--color-acento-suave)] text-[var(--color-acento)]"
              >
                {p}
              </span>
            ))}
          </span>
        ) : (
          <span className="text-sm text-[var(--color-tinta-3)]">
            Todo el histórico
          </span>
        )}

        {pendiente && (
          <span className="text-xs text-[var(--color-tinta-3)]">
            Actualizando…
          </span>
        )}

        <ChevronAbajo />
      </summary>

      <div className="border-t border-[var(--color-borde)] p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {[
            { dias: 0, texto: "Hoy" },
            { dias: 7, texto: "Últimos 7 días" },
            { dias: 30, texto: "Últimos 30 días" },
          ].map((a) => {
            const activo = rangoActivo(a.dias);
            return (
              <button
                key={a.dias}
                type="button"
                aria-pressed={activo}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  activo
                    ? "border-[var(--color-acento)] bg-[var(--color-acento)] text-white"
                    : "border-[var(--color-borde-fuerte)] bg-white text-[var(--color-tinta-2)] hover:border-[var(--color-tinta-3)] hover:bg-slate-50"
                }`}
                onClick={() => atajoDias(a.dias)}
              >
                {a.texto}
              </button>
            );
          })}

          {puestos.length > 0 && (
            <button
              type="button"
              className="ml-auto rounded-full px-3 py-1.5 text-xs font-semibold text-[var(--color-tinta-2)] underline underline-offset-2 transition hover:text-[var(--color-tinta)]"
              onClick={() => {
                setIncidente("");
                iniciar(() => router.push(ruta));
              }}
            >
              Limpiar todo
            </button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo etiqueta="Desde">
            <input
              type="date"
              className="campo"
              value={params.get("desde") ?? ""}
              onChange={(e) => aplicar({ desde: e.target.value })}
            />
          </Campo>

          <Campo etiqueta="Hasta">
            <input
              type="date"
              className="campo"
              value={params.get("hasta") ?? ""}
              onChange={(e) => aplicar({ hasta: e.target.value })}
            />
          </Campo>

          <Campo etiqueta="Cuadrilla (Móvil N.º)">
            <select
              className="campo"
              value={params.get("cuadrilla") ?? ""}
              onChange={(e) => aplicar({ cuadrilla: e.target.value })}
            >
              <option value="">Todas</option>
              {cuadrillas.map((c) => (
                <option key={c} value={c}>
                  Móvil {c}
                </option>
              ))}
            </select>
          </Campo>

          {conEstado && (
            <Campo etiqueta="Estado">
              <select
                className="campo"
                value={params.get("estado") ?? ""}
                onChange={(e) => aplicar({ estado: e.target.value })}
              >
                <option value="">Todos</option>
                {ESTADOS.map((e) => (
                  <option key={e.valor} value={e.valor}>
                    {e.etiqueta}
                  </option>
                ))}
              </select>
            </Campo>
          )}

          {conIncidente && (
            <div className="lg:col-span-2">
              <Campo etiqueta="Buscar por N.º de incidente">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    aplicar({ incidente });
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="search"
                    inputMode="numeric"
                    className="campo"
                    placeholder="Ej.: 13509097"
                    value={incidente}
                    onChange={(e) => setIncidente(e.target.value)}
                  />
                  <button type="submit" className="boton-secundario shrink-0">
                    Buscar
                  </button>
                </form>
              </Campo>
            </div>
          )}
        </div>
      </div>
    </details>
  );
}

function Campo({
  etiqueta,
  children,
}: {
  etiqueta: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-[var(--color-tinta-2)]">
        {etiqueta}
      </span>
      {children}
    </label>
  );
}

function IconoFiltro() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="shrink-0 text-[var(--color-tinta-3)]"
      aria-hidden="true"
    >
      <path d="M3.5 5.5h17l-6.5 7.5v5.5l-4 2v-7.5z" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronAbajo() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="ml-auto shrink-0 text-[var(--color-tinta-3)] transition group-open:rotate-180"
      aria-hidden="true"
    >
      <path d="M6 9.5 12 15l6-5.5" />
    </svg>
  );
}
