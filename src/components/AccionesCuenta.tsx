"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Estado = "PENDIENTE" | "ACTIVO" | "BLOQUEADO";
type Rol = "OPERARIO" | "ADMINISTRADOR";

/**
 * Botones para habilitar, dar de baja y cambiar el rol de una cuenta.
 *
 * La propia cuenta no se puede tocar a sí misma: quitarse el acceso o bajarse
 * el rol por accidente dejaría el sistema sin administrador y sin forma de
 * recuperarlo desde la app.
 */
export function AccionesCuenta({
  id,
  estado,
  rol,
  esYo,
}: {
  id: string;
  estado: Estado;
  rol: Rol;
  esYo: boolean;
}) {
  const router = useRouter();
  const [enviando, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function cambiar(cambios: { estado?: Estado; rol?: Rol }) {
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
      {error && (
        <span className="text-xs text-[var(--color-mal)]">{error}</span>
      )}

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
          <select
            className="campo min-h-0 w-auto py-1.5 text-xs"
            value={rol}
            disabled={enviando}
            onChange={(e) => cambiar({ rol: e.target.value as Rol })}
            aria-label="Rol"
          >
            <option value="OPERARIO">Operario</option>
            <option value="ADMINISTRADOR">Administrador</option>
          </select>
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
