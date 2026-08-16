"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Ingreso del código de seis dígitos que llegó por correo.
 *
 * Hasta que esto no se confirma, el reclamo no aparece en la lista del
 * municipio: es lo que evita que alguien cargue cien reclamos falsos con
 * direcciones de correo inventadas.
 */
export function VerificarReclamo({ codigo }: { codigo: string }) {
  const router = useRouter();
  const [valor, setValor] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verificar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);

    try {
      const respuesta = await fetch(
        `/api/reclamos-vecinales/${codigo}/verificar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ codigo: valor }),
        },
      );
      const datos = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        setError(datos.error ?? "No se pudo confirmar el código.");
        return;
      }

      router.refresh();
    } catch {
      setError("Falló la conexión. Volvé a intentar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="tarjeta border-[var(--color-alerta-borde)] bg-[var(--color-alerta-fondo)] p-5">
      <h2 className="text-base font-semibold">Confirmá tu correo</h2>
      <p className="bajada mt-1">
        Te mandamos un código de seis números. Ingresalo acá para que el
        reclamo entre al sistema. Si no lo ves, mirá en correo no deseado.
      </p>

      <form onSubmit={verificar} className="mt-4 flex flex-wrap gap-2">
        <input
          className="campo w-auto flex-1 text-center text-lg tracking-[0.4em] tabular-nums"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={valor}
          onChange={(e) => setValor(e.target.value.replace(/\D/g, ""))}
          placeholder="000000"
          aria-label="Código de seis números"
        />
        <button
          type="submit"
          className="boton-primario shrink-0"
          disabled={enviando || valor.length !== 6}
        >
          {enviando ? "Confirmando…" : "Confirmar"}
        </button>
      </form>

      {error && (
        <p className="mt-3 text-sm font-medium text-[var(--color-mal)]">
          {error}
        </p>
      )}
    </section>
  );
}
