"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function CargarPlanilla() {
  const router = useRouter();
  const inputCamara = useRef<HTMLInputElement>(null);
  const inputArchivo = useRef<HTMLInputElement>(null);

  const [archivo, setArchivo] = useState<File | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  const [analizando, setAnalizando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function elegir(lista: FileList | null) {
    const elegido = lista?.[0];
    if (!elegido) return;
    setError(null);
    setArchivo(elegido);
    setVistaPrevia((anterior) => {
      if (anterior) URL.revokeObjectURL(anterior);
      return URL.createObjectURL(elegido);
    });
  }

  async function analizar() {
    if (!archivo) return;
    setAnalizando(true);
    setError(null);

    try {
      const cuerpo = new FormData();
      cuerpo.append("imagen", archivo);

      const respuesta = await fetch("/api/planillas", {
        method: "POST",
        body: cuerpo,
      });
      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setError(datos.error ?? "No se pudo analizar la planilla.");
        return;
      }

      router.push(`/revisar/${datos.id}`);
    } catch {
      setError(
        "Falló la conexión. Revisá la señal y volvé a intentar; la foto no se perdió.",
      );
    } finally {
      setAnalizando(false);
    }
  }

  return (
    <div className="space-y-4">
      <input
        ref={inputCamara}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => elegir(e.target.files)}
      />
      <input
        ref={inputArchivo}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => elegir(e.target.files)}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          className="boton-primario"
          onClick={() => inputCamara.current?.click()}
          disabled={analizando}
        >
          Tomar foto
        </button>
        <button
          type="button"
          className="boton-secundario"
          onClick={() => inputArchivo.current?.click()}
          disabled={analizando}
        >
          Elegir una imagen
        </button>
      </div>

      {vistaPrevia && (
        <div className="tarjeta overflow-hidden">
          {/* Imagen local del navegador: <img> evita el optimizador de Next. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={vistaPrevia}
            alt="Vista previa de la planilla"
            className="max-h-[26rem] w-full object-contain bg-slate-100"
          />
          <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <span className="truncate text-slate-600">{archivo?.name}</span>
            <span className="shrink-0 text-slate-500">
              {archivo ? `${(archivo.size / 1024 / 1024).toFixed(1)} MB` : ""}
            </span>
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <button
        type="button"
        className="boton-primario w-full"
        onClick={analizar}
        disabled={!archivo || analizando}
      >
        {analizando ? "Leyendo la planilla…" : "Analizar planilla"}
      </button>

      {analizando && (
        <p className="text-center text-sm text-slate-600">
          Puede tardar hasta un minuto. No cierres la pantalla.
        </p>
      )}
    </div>
  );
}
