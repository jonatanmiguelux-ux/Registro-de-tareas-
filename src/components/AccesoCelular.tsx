"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Gestiona el acceso desde el celular de una cuadrilla, para el administrador.
 *
 * Muestra el enlace y su código QR para abrir en el teléfono del equipo, y
 * permite generarlo, regenerarlo (desactiva el celular anterior) o quitarlo.
 */
export function AccesoCelular({
  numero,
  enlace,
  qr,
}: {
  numero: number;
  /** Enlace de activación, o null si la cuadrilla no tiene acceso todavía. */
  enlace: string | null;
  /** El QR del enlace como imagen (data URI), o null. */
  qr: string | null;
}) {
  const router = useRouter();
  const [enviando, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  function accion(accion: "generar" | "quitar") {
    setError(null);
    iniciar(async () => {
      try {
        const r = await fetch("/api/cuadrillas/acceso", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ numero, accion }),
        });
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          setError(d.error ?? "No se pudo. Probá de nuevo.");
          return;
        }
        router.refresh();
      } catch {
        setError("Falló la conexión.");
      }
    });
  }

  async function copiar() {
    if (!enlace) return;
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setError("No se pudo copiar. Copiá el enlace a mano.");
    }
  }

  if (!enlace) {
    return (
      <div>
        <button
          type="button"
          className="boton-secundario min-h-0 px-3 py-2 text-xs"
          disabled={enviando}
          onClick={() => accion("generar")}
        >
          {enviando ? "Generando…" : "Generar acceso para el celular"}
        </button>
        {error && (
          <p className="mt-1.5 text-xs text-[var(--color-mal)]">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-start gap-4">
      {qr && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={qr}
          alt={`Código QR de la cuadrilla ${numero}`}
          className="size-28 shrink-0 rounded-lg border border-[var(--color-borde)] bg-white"
        />
      )}
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-xs leading-relaxed text-[var(--color-tinta-2)]">
          Escaneá este código con el celular de la cuadrilla, o mandale el
          enlace. Al abrirlo, ese teléfono queda fijado a la cuadrilla {numero}.
        </p>
        <p className="break-all rounded-lg bg-[var(--color-fondo)] px-2.5 py-1.5 font-mono text-[0.7rem] text-[var(--color-tinta-2)]">
          {enlace}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="boton-secundario min-h-0 px-3 py-1.5 text-xs"
            onClick={copiar}
          >
            {copiado ? "¡Copiado!" : "Copiar enlace"}
          </button>
          <button
            type="button"
            className="boton-fantasma min-h-0 px-3 py-1.5 text-xs"
            disabled={enviando}
            onClick={() => {
              if (
                confirm(
                  `Se va a generar un enlace nuevo para la cuadrilla ${numero}. El celular que estaba activado con el anterior va a dejar de entrar y habrá que reactivarlo. ¿Seguimos?`,
                )
              ) {
                accion("generar");
              }
            }}
          >
            Regenerar
          </button>
          <button
            type="button"
            className="boton-fantasma min-h-0 px-3 py-1.5 text-xs text-[var(--color-mal)]"
            disabled={enviando}
            onClick={() => {
              if (
                confirm(
                  `Se va a quitar el acceso de la cuadrilla ${numero}. El celular activado deja de entrar. ¿Seguimos?`,
                )
              ) {
                accion("quitar");
              }
            }}
          >
            Quitar acceso
          </button>
        </div>
        {error && <p className="text-xs text-[var(--color-mal)]">{error}</p>}
      </div>
    </div>
  );
}
