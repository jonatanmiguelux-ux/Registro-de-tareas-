"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Destino = {
  ruta: string;
  enLaNube: boolean;
  manual: boolean;
  nombre: string;
};

/**
 * Elegir a qué carpeta va el Excel de cada día.
 *
 * Sirve cualquier nube que cree una carpeta en la PC —Drive, OneDrive,
 * Dropbox, Mega—, porque para la app son todas lo mismo: un lugar donde dejar
 * un archivo. Por eso se pide una ruta y no se ofrece una lista cerrada de
 * servicios: el día que aparezca otro, ya está soportado.
 */
export function ConfiguracionRespaldo({
  destinoInicial,
  rutaInicial,
  conservarInicial,
  pendientes,
}: {
  destinoInicial: Destino;
  rutaInicial: string;
  conservarInicial: number;
  pendientes: number;
}) {
  const router = useRouter();
  const [ruta, setRuta] = useState(rutaInicial);
  const [conservar, setConservar] = useState(String(conservarInicial));
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [guardando, iniciar] = useTransition();

  function guardar() {
    setError(null);
    setAviso(null);

    const n = Number(conservar);
    if (!Number.isInteger(n) || n < 1) {
      setError("La cantidad de copias tiene que ser un número entero mayor que cero.");
      return;
    }

    iniciar(async () => {
      try {
        const respuesta = await fetch("/api/respaldos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ destino: ruta.trim(), conservar: n }),
        });
        const datos = await respuesta.json().catch(() => ({}));

        if (!respuesta.ok) {
          setError(datos.error ?? "No se pudo guardar.");
          return;
        }

        setAviso(
          datos.subidos > 0
            ? `Guardado. Se subieron ${datos.subidos} archivo${datos.subidos === 1 ? "" : "s"} que estaban esperando.`
            : "Guardado.",
        );
        router.refresh();
      } catch {
        setError("Falló la conexión. Volvé a intentar.");
      }
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="ruta" className="text-sm font-medium">
          Carpeta de la nube
        </label>
        <p className="mt-1 text-xs leading-relaxed text-[var(--color-tinta-3)]">
          Pegá acá la ruta de la carpeta que creó tu nube en esta PC. Sirve
          Google Drive, OneDrive, Dropbox, Mega o cualquier otra: para la app
          son todas una carpeta más. Dejalo <strong>vacío</strong> para que la
          busque sola.
        </p>
        <input
          id="ruta"
          type="text"
          className="campo mt-2 font-mono text-xs"
          value={ruta}
          disabled={guardando}
          spellCheck={false}
          placeholder="G:\Mi unidad\Alumbrado publico"
          onChange={(e) => setRuta(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="conservar" className="text-sm font-medium">
          Copias a conservar
        </label>
        <p className="mt-1 text-xs text-[var(--color-tinta-3)]">
          Las más viejas se van borrando. 60 son unos tres meses de días
          hábiles.
        </p>
        <input
          id="conservar"
          type="number"
          min={1}
          max={3650}
          className="campo mt-2 w-32"
          value={conservar}
          disabled={guardando}
          onChange={(e) => setConservar(e.target.value)}
        />
      </div>

      {error && (
        <p className="rounded-lg border border-[var(--color-alerta-borde)] bg-[var(--color-mal-fondo)] px-4 py-3 text-sm text-[var(--color-mal)]">
          {error}
        </p>
      )}

      {aviso && (
        <p className="rounded-lg bg-[var(--color-bien-fondo)] px-4 py-3 text-sm text-[var(--color-bien)]">
          {aviso}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="boton-primario"
          disabled={guardando}
          onClick={guardar}
        >
          {guardando ? "Guardando..." : "Guardar"}
        </button>

        {ruta !== rutaInicial && (
          <button
            type="button"
            className="boton-secundario"
            disabled={guardando}
            onClick={() => {
              setRuta(rutaInicial);
              setError(null);
              setAviso(null);
            }}
          >
            Deshacer
          </button>
        )}

        {pendientes > 0 && !destinoInicial.enLaNube && (
          <span className="text-xs text-[var(--color-alerta)]">
            Al guardar una carpeta válida se suben los {pendientes} que están
            esperando.
          </span>
        )}
      </div>
    </div>
  );
}
