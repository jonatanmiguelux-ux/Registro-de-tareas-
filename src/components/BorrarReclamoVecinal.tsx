"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Borrar de verdad un reclamo de vecino, con su foto. Sólo el administrador.
 *
 * Va en la lista de resueltos, donde ya no hay más acciones que esta: sirve
 * para limpiar una prueba, un duplicado o un derivado cargado por error. En
 * dos pasos, porque no se puede deshacer.
 */
export function BorrarReclamoVecinal({ codigo }: { codigo: string }) {
  const router = useRouter();
  const [confirmar, setConfirmar] = useState(false);
  const [enviando, iniciar] = useTransition();

  if (confirmar) {
    return (
      <span className="flex items-center gap-2 text-xs">
        <span className="text-[var(--color-tinta-3)]">¿Borrar?</span>
        <button
          type="button"
          className="font-semibold text-[var(--color-mal)] underline underline-offset-2"
          disabled={enviando}
          onClick={() =>
            iniciar(async () => {
              const r = await fetch(`/api/reclamos-vecinales/${codigo}`, {
                method: "DELETE",
              });
              if (r.ok) router.refresh();
              else setConfirmar(false);
            })
          }
        >
          Sí
        </button>
        <button
          type="button"
          className="text-[var(--color-tinta-3)] underline underline-offset-2"
          onClick={() => setConfirmar(false)}
        >
          No
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      className="text-xs text-[var(--color-tinta-3)] underline underline-offset-2 hover:text-[var(--color-mal)]"
      onClick={() => setConfirmar(true)}
    >
      Borrar
    </button>
  );
}
