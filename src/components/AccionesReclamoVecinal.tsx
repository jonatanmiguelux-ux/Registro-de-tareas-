"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Lo que hace el municipio con un reclamo de vecino: anotarle el N.º de
 * incidente que devolvió el sistema oficial, o descartarlo.
 *
 * El número no lo genera esta app a propósito: si inventara uno propio,
 * convivirían dos numeraciones y la cuadrilla recibiría papeles que no cierran
 * con el sistema del municipio.
 */
export function AccionesReclamoVecinal({ codigo }: { codigo: string }) {
  const router = useRouter();
  const [numero, setNumero] = useState("");
  const [enviando, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function guardar(cambios: { nroIncidente?: string; descartar?: boolean }) {
    setError(null);
    iniciar(async () => {
      try {
        const respuesta = await fetch(`/api/reclamos-vecinales/${codigo}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cambios),
        });
        if (!respuesta.ok) {
          const datos = await respuesta.json().catch(() => ({}));
          setError(datos.error ?? "No se pudo guardar.");
          return;
        }
        router.refresh();
      } catch {
        setError("Falló la conexión. Volvé a intentar.");
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={`/api/reclamos-vecinales/${codigo}/foto`}
          target="_blank"
          rel="noopener"
          className="boton-secundario min-h-0 px-3 py-2 text-xs"
        >
          Ver la foto
        </a>

        <form
          className="flex flex-1 flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (numero.trim()) guardar({ nroIncidente: numero.trim() });
          }}
        >
          <input
            className="campo min-h-0 w-auto flex-1 py-2 text-sm tabular-nums"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="N.º de incidente del sistema"
            inputMode="numeric"
            aria-label="N.º de incidente"
          />
          <button
            type="submit"
            className="boton-primario min-h-0 shrink-0 px-3 py-2 text-xs"
            disabled={enviando || !numero.trim()}
          >
            Guardar
          </button>
        </form>

        <button
          type="button"
          className="boton-fantasma min-h-0 px-3 py-2 text-xs"
          disabled={enviando}
          onClick={() => {
            if (
              confirm(
                "Descartar este reclamo. El vecino va a ver que no siguió adelante. ¿Seguimos?",
              )
            ) {
              guardar({ descartar: true });
            }
          }}
        >
          Descartar
        </button>
      </div>

      {error && (
        <p className="text-xs font-medium text-[var(--color-mal)]">{error}</p>
      )}
    </div>
  );
}
