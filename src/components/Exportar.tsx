"use client";

import { useState } from "react";

/**
 * Descarga del .xlsx. Los filtros son opcionales: sin nada cargado se exporta
 * todo el histórico acumulado.
 */
export function Exportar() {
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [soloConfirmadas, setSoloConfirmadas] = useState(false);

  function descargar() {
    const parametros = new URLSearchParams();
    if (desde) parametros.set("desde", desde);
    if (hasta) parametros.set("hasta", hasta);
    if (soloConfirmadas) parametros.set("soloConfirmadas", "1");
    window.location.href = `/api/export?${parametros.toString()}`;
  }

  return (
    <div className="tarjeta p-4">
      <h2 className="text-sm font-semibold text-slate-700">Exportar a Excel</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Desde
          </span>
          <input
            type="date"
            className="campo"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Hasta
          </span>
          <input
            type="date"
            className="campo"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
          />
        </label>
        <button type="button" className="boton-primario" onClick={descargar}>
          Descargar .xlsx
        </button>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          className="size-4 accent-[var(--color-acento)]"
          checked={soloConfirmadas}
          onChange={(e) => setSoloConfirmadas(e.target.checked)}
        />
        Incluir solamente las planillas confirmadas
      </label>
    </div>
  );
}
