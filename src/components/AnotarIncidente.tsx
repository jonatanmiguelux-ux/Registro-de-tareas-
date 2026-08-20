"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Para el celular de la cuadrilla: anotar el N.º de incidente de un reclamo.
 *
 * Es lo único que el teléfono puede hacer con un reclamo. No descarta ni edita
 * nada más. El número no lo inventa la app: lo copia de lo que devolvió el
 * sistema oficial del municipio.
 */
export function AnotarIncidente({ codigo }: { codigo: string }) {
  const router = useRouter();
  const [numero, setNumero] = useState("");
  const [enviando, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function guardar() {
    const limpio = numero.trim();
    if (!limpio) {
      setError("Escribí el número de incidente.");
      return;
    }
    setError(null);
    iniciar(async () => {
      try {
        const respuesta = await fetch("/api/dispositivo/incidente", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ codigo, nroIncidente: limpio }),
        });
        if (!respuesta.ok) {
          const datos = await respuesta.json().catch(() => ({}));
          setError(datos.error ?? "No se pudo guardar. Probá de nuevo.");
          return;
        }
        router.refresh();
      } catch {
        setError("Falló la conexión. Revisá la señal y volvé a intentar.");
      }
    });
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          className="campo min-h-11 flex-1"
          placeholder="N.º de incidente del sistema"
          value={numero}
          disabled={enviando}
          onChange={(e) => setNumero(e.target.value)}
        />
        <button
          type="button"
          className="boton-primario shrink-0"
          disabled={enviando}
          onClick={guardar}
        >
          {enviando ? "Guardando…" : "Guardar"}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-sm text-[var(--color-mal)]">{error}</p>
      )}
    </div>
  );
}
