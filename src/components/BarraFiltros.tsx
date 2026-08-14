"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { ESTADOS } from "@/lib/filtros";

/**
 * Filtros de fecha, cuadrilla, estado y N.º de incidente.
 *
 * Viven en la query string: así el estado del filtro se comparte con un link,
 * sobrevive al refresh y es lo mismo que consume el botón de exportar.
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

  const activos = ["desde", "hasta", "cuadrilla", "estado", "incidente"].filter(
    (c) => params.get(c),
  ).length;

  return (
    <div className="tarjeta p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Desde
          </span>
          <input
            type="date"
            className="campo"
            value={params.get("desde") ?? ""}
            onChange={(e) => aplicar({ desde: e.target.value })}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Hasta
          </span>
          <input
            type="date"
            className="campo"
            value={params.get("hasta") ?? ""}
            onChange={(e) => aplicar({ hasta: e.target.value })}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Cuadrilla (Móvil N.º)
          </span>
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
        </label>

        {conEstado && (
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Estado
            </span>
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
          </label>
        )}

        {conIncidente && (
          <label className="block lg:col-span-2">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Buscar por N.º de incidente
            </span>
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
                placeholder="Ej.: 4471"
                value={incidente}
                onChange={(e) => setIncidente(e.target.value)}
              />
              <button type="submit" className="boton-secundario shrink-0 px-3 py-2">
                Buscar
              </button>
            </form>
          </label>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-xs text-slate-500">Atajos:</span>
        <button type="button" className="boton-secundario px-3 py-1.5 text-xs" onClick={() => atajoDias(0)}>
          Hoy
        </button>
        <button type="button" className="boton-secundario px-3 py-1.5 text-xs" onClick={() => atajoDias(7)}>
          Últimos 7 días
        </button>
        <button type="button" className="boton-secundario px-3 py-1.5 text-xs" onClick={() => atajoDias(30)}>
          Últimos 30 días
        </button>
        {activos > 0 && (
          <button
            type="button"
            className="boton-secundario px-3 py-1.5 text-xs"
            onClick={() => {
              setIncidente("");
              iniciar(() => router.push(ruta));
            }}
          >
            Limpiar ({activos})
          </button>
        )}
        {pendiente && <span className="text-xs text-slate-500">Actualizando…</span>}
      </div>
    </div>
  );
}
