"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RolUsuario, EstadoUsuario } from "@prisma/client";
import { ESCALERA, NOMBRE_ROL } from "@/lib/roles";

type Estado = EstadoUsuario;
type Rol = RolUsuario;

/**
 * Botones para habilitar, dar de baja y cambiar el rol de una cuenta.
 *
 * El desplegable de rol **sólo aparece para el administrador**. El jefe puede
 * habilitar y dar de baja gente —la gestión de todos los días— pero no cambiar
 * roles: si pudiera, podría ascenderse a sí mismo o nombrar a otro por
 * encima, y la jerarquía se reescribiría desde adentro.
 *
 * La propia cuenta no se puede tocar a sí misma: quitarse el acceso o bajarse
 * el rol por accidente dejaría el sistema sin administrador y sin forma de
 * recuperarlo desde la app.
 */
export function AccionesCuenta({
  id,
  estado,
  rol,
  cuadrilla,
  cuadrillasDisponibles,
  esYo,
  puedeCambiarRol,
}: {
  id: string;
  estado: Estado;
  rol: Rol;
  cuadrilla: number | null;
  /** Números de cuadrilla que existen, para el desplegable. */
  cuadrillasDisponibles: number[];
  esYo: boolean;
  puedeCambiarRol: boolean;
}) {
  const router = useRouter();
  const [enviando, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function cambiar(cambios: {
    estado?: Estado;
    rol?: Rol;
    cuadrilla?: number | null;
  }) {
    setError(null);
    iniciar(async () => {
      try {
        const respuesta = await fetch(`/api/cuentas/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cambios),
        });
        if (!respuesta.ok) {
          const datos = await respuesta.json().catch(() => ({}));
          setError(datos.error ?? "No se pudo guardar el cambio.");
          return;
        }
        router.refresh();
      } catch {
        setError("Falló la conexión. Volvé a intentar.");
      }
    });
  }

  if (esYo) {
    return (
      <span className="shrink-0 text-xs text-[var(--color-tinta-3)]">
        No podés modificar tu propia cuenta
      </span>
    );
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      {error && <span className="text-xs text-[var(--color-mal)]">{error}</span>}

      {estado !== "ACTIVO" ? (
        <button
          type="button"
          className="boton-primario min-h-0 px-3 py-2 text-xs"
          disabled={enviando}
          onClick={() => cambiar({ estado: "ACTIVO" })}
        >
          {estado === "PENDIENTE" ? "Habilitar" : "Restablecer acceso"}
        </button>
      ) : (
        <>
          {puedeCambiarRol ? (
            <select
              className="campo min-h-0 w-auto py-1.5 text-xs"
              value={rol}
              disabled={enviando}
              onChange={(e) => cambiar({ rol: e.target.value as Rol })}
              aria-label="Rol"
            >
              {ESCALERA.map((r) => (
                <option key={r} value={r}>
                  {NOMBRE_ROL[r]}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs text-[var(--color-tinta-3)]">
              {NOMBRE_ROL[rol]}
            </span>
          )}

          {/* Cuadrilla asignada. Sólo el administrador puede cambiarla; para el
              resto se muestra como texto. Define qué reclamos ve la persona en
              "Mi cuadrilla". "Sin cuadrilla" es válido: administración, o un
              jefe que coordina todas. */}
          {puedeCambiarRol ? (
            <select
              className="campo min-h-0 w-auto py-1.5 text-xs"
              value={cuadrilla ?? ""}
              disabled={enviando}
              onChange={(e) =>
                cambiar({
                  cuadrilla: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              aria-label="Cuadrilla"
            >
              <option value="">Sin cuadrilla</option>
              {cuadrillasDisponibles.map((n) => (
                <option key={n} value={n}>
                  Cuadrilla {n}
                </option>
              ))}
            </select>
          ) : cuadrilla !== null ? (
            <span className="text-xs text-[var(--color-tinta-3)]">
              Cuadrilla {cuadrilla}
            </span>
          ) : null}

          <button
            type="button"
            className="boton-secundario min-h-0 px-3 py-2 text-xs"
            disabled={enviando}
            onClick={() => {
              if (
                confirm(
                  "Se le retira el acceso a esta cuenta. Podés volver a habilitarla cuando quieras. ¿Seguimos?",
                )
              ) {
                cambiar({ estado: "BLOQUEADO" });
              }
            }}
          >
            Dar de baja
          </button>
        </>
      )}
    </div>
  );
}
