"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BorrarPlanilla({ id }: { id: string }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [borrando, setBorrando] = useState(false);

  async function borrar() {
    setBorrando(true);
    try {
      await fetch(`/api/planillas/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBorrando(false);
      setConfirmando(false);
    }
  }

  if (!confirmando) {
    return (
      <button
        type="button"
        className="boton-secundario px-3 py-2 text-[var(--color-tinta-2)]"
        onClick={() => setConfirmando(true)}
      >
        Borrar
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        className="boton px-3 py-2 bg-red-600 text-white hover:bg-red-700"
        onClick={borrar}
        disabled={borrando}
      >
        {borrando ? "Borrando…" : "Confirmar"}
      </button>
      <button
        type="button"
        className="boton-secundario px-3 py-2"
        onClick={() => setConfirmando(false)}
        disabled={borrando}
      >
        No
      </button>
    </div>
  );
}
