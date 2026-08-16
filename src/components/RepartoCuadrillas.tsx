"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type CuadrillaVista = {
  numero: number;
  localidades: string[];
  zona: string;
  pendientes: number;
};

/**
 * Reparto de localidades entre cuadrillas.
 *
 * La lista va **por localidad y no por cuadrilla**: cada una tiene un
 * desplegable con el equipo que la cubre. Así es imposible dejar una localidad
 * en dos cuadrillas a la vez —que mandaría dos equipos al mismo poste—, y
 * queda a la vista de un vistazo si alguna quedó sin nadie.
 */
export function RepartoCuadrillas({
  cuadrillas,
  localidades,
}: {
  cuadrillas: CuadrillaVista[];
  localidades: string[];
}) {
  const router = useRouter();
  const [guardando, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [nueva, setNueva] = useState("");

  const deLocalidad = new Map<string, number>();
  for (const c of cuadrillas) {
    for (const l of c.localidades) deLocalidad.set(l, c.numero);
  }

  function llamar(
    metodo: "PATCH" | "POST" | "DELETE",
    cuerpo?: unknown,
    query = "",
  ) {
    setError(null);
    iniciar(async () => {
      try {
        const respuesta = await fetch(`/api/cuadrillas${query}`, {
          method: metodo,
          headers: cuerpo ? { "Content-Type": "application/json" } : undefined,
          body: cuerpo ? JSON.stringify(cuerpo) : undefined,
        });
        if (!respuesta.ok) {
          const datos = await respuesta.json().catch(() => ({}));
          setError(datos.error ?? "No se pudo guardar el cambio.");
          return;
        }
        setNueva("");
        router.refresh();
      } catch {
        setError("Falló la conexión. Volvé a intentar.");
      }
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg border border-red-200 bg-[var(--color-mal-fondo)] px-4 py-3 text-sm text-[var(--color-mal)]">
          {error}
        </p>
      )}

      <section className="tarjeta overflow-hidden">
        <div className="tarjeta-titulo">
          <h2 className="text-sm font-semibold">Quién cubre cada localidad</h2>
          <p className="text-xs text-[var(--color-tinta-3)]">
            Cambiá el desplegable para mover una localidad de equipo
          </p>
        </div>
        <ul className="divide-y divide-[var(--color-borde)]">
          {localidades.map((l) => {
            const asignada = deLocalidad.get(l) ?? null;
            return (
              <li
                key={l}
                className="flex flex-wrap items-center gap-3 px-4 py-2.5"
              >
                <span className="min-w-0 flex-1 text-sm font-medium">{l}</span>
                {asignada === null && (
                  <span className="etiqueta bg-[var(--color-alerta-fondo)] text-[var(--color-alerta)]">
                    Sin cuadrilla
                  </span>
                )}
                <select
                  className="campo min-h-0 w-auto py-1.5 text-sm"
                  value={asignada ?? ""}
                  disabled={guardando}
                  aria-label={`Cuadrilla de ${l}`}
                  onChange={(e) =>
                    llamar("PATCH", {
                      localidad: l,
                      numero: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                >
                  <option value="">Sin asignar</option>
                  {cuadrillas.map((c) => (
                    <option key={c.numero} value={c.numero}>
                      Cuadrilla {c.numero}
                    </option>
                  ))}
                </select>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="tarjeta overflow-hidden">
        <div className="tarjeta-titulo">
          <h2 className="text-sm font-semibold">Las cuadrillas</h2>
        </div>
        <ul className="divide-y divide-[var(--color-borde)]">
          {cuadrillas.map((c) => (
            <li
              key={c.numero}
              className="flex flex-wrap items-center gap-3 px-4 py-3"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">
                  Cuadrilla {c.numero}
                  <span className="ml-2 font-normal text-[var(--color-tinta-3)]">
                    Móvil {c.numero}
                  </span>
                </span>
                <span className="mt-0.5 block text-xs text-[var(--color-tinta-2)]">
                  {c.zona}
                </span>
              </span>

              {c.pendientes > 0 && (
                <span className="etiqueta bg-[var(--color-acento-suave)] text-[var(--color-acento)]">
                  {c.pendientes} reclamo{c.pendientes === 1 ? "" : "s"}
                </span>
              )}

              <button
                type="button"
                className="boton-fantasma min-h-0 px-3 py-1.5 text-xs"
                disabled={guardando || c.localidades.length > 0}
                title={
                  c.localidades.length > 0
                    ? "Primero pasá sus localidades a otra cuadrilla"
                    : undefined
                }
                onClick={() => {
                  if (confirm(`¿Dar de baja la cuadrilla ${c.numero}?`)) {
                    llamar("DELETE", undefined, `?numero=${c.numero}`);
                  }
                }}
              >
                Dar de baja
              </button>
            </li>
          ))}
        </ul>

        <form
          className="flex flex-wrap items-center gap-2 border-t border-[var(--color-borde)] px-4 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            const numero = Number(nueva);
            if (Number.isInteger(numero) && numero > 0) {
              llamar("POST", { numero });
            }
          }}
        >
          <label className="text-sm text-[var(--color-tinta-2)]">
            Agregar cuadrilla N.º
          </label>
          <input
            className="campo min-h-0 w-20 py-1.5 text-sm tabular-nums"
            inputMode="numeric"
            value={nueva}
            onChange={(e) => setNueva(e.target.value.replace(/\D/g, ""))}
            placeholder="5"
            aria-label="Número de la cuadrilla nueva"
          />
          <button
            type="submit"
            className="boton-secundario min-h-0 px-3 py-1.5 text-xs"
            disabled={guardando || !nueva}
          >
            Agregar
          </button>
        </form>
      </section>
    </div>
  );
}
