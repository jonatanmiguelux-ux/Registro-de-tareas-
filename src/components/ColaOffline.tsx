"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { contar, hayCola, vaciar, type ResultadoSubida } from "@/lib/cola";

/** Cada cuánto reintentar mientras haya fotos esperando. */
const REINTENTO_MS = 30_000;

/**
 * Vigila la cola de fotos sin señal y las sube cuando vuelve la conexión.
 *
 * Vive en el layout para que funcione desde cualquier pantalla: alguien puede
 * sacar la foto sin señal, seguir mirando el historial y que la subida ocurra
 * mientras tanto.
 *
 * El navegador tiene que estar abierto en la app. Subir con la app cerrada
 * necesita Background Sync, que Android soporta pero iOS no, así que se
 * prefiere un mecanismo que funcione igual en los dos antes que uno que ande
 * en la mitad de los celulares.
 */
export function ColaOffline() {
  const router = useRouter();
  const [pendientes, setPendientes] = useState(0);
  const [subiendo, setSubiendo] = useState(false);
  const [subidas, setSubidas] = useState<
    { planillaId: string; nombre: string }[]
  >([]);
  const [rechazos, setRechazos] = useState<
    { nombre: string; motivo: string }[]
  >([]);
  const [sinSesion, setSinSesion] = useState<string | null>(null);

  const procesar = useCallback(async () => {
    if (!hayCola()) return;
    if (document.visibilityState === "hidden") return;

    const cuantas = await contar();
    setPendientes(cuantas);
    if (cuantas === 0) return;
    // No se le pregunta a `navigator.onLine`: miente seguido (dice "sin
    // conexión" habiendo). Se intenta subir directamente; si de verdad no hay
    // red, `vaciar()` lo detecta con el intento fallido y deja las fotos en la
    // cola para el próximo reintento. Nunca se pierde ninguna.

    setSubiendo(true);
    try {
      const resultados: ResultadoSubida[] = await vaciar();

      const nuevas = resultados.filter((r) => r.estado === "subida");
      const fallidas = resultados.filter((r) => r.estado === "rechazada");
      const caducada = resultados.find((r) => r.estado === "sin-sesion");

      // La foto sigue guardada; lo que falta es volver a entrar.
      setSinSesion(caducada ? caducada.motivo : null);

      if (nuevas.length > 0) {
        setSubidas((previas) => [
          ...previas,
          ...nuevas.map((r) => ({ planillaId: r.planillaId, nombre: r.nombre })),
        ]);
        // El historial y el tablero acaban de cambiar.
        router.refresh();
      }
      if (fallidas.length > 0) {
        setRechazos((previos) => [
          ...previos,
          ...fallidas.map((r) => ({ nombre: r.nombre, motivo: r.motivo })),
        ]);
      }
    } finally {
      setSubiendo(false);
      setPendientes(await contar());
    }
  }, [router]);

  useEffect(() => {
    if (!hayCola()) return;

    void procesar();

    // Tres señales para reintentar: que vuelva la red, que la persona vuelva
    // a la app, y un reloj por si el evento `online` no llega (pasa cuando se
    // recupera la señal sin cambiar de red).
    const alVolver = () => void procesar();
    window.addEventListener("online", alVolver);
    document.addEventListener("visibilitychange", alVolver);
    // La pantalla de carga avisa por acá cuando acaba de guardar una foto.
    window.addEventListener("planilla-encolada", alVolver);
    const reloj = setInterval(alVolver, REINTENTO_MS);

    return () => {
      window.removeEventListener("online", alVolver);
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("planilla-encolada", alVolver);
      clearInterval(reloj);
    };
  }, [procesar]);

  if (
    pendientes === 0 &&
    subidas.length === 0 &&
    rechazos.length === 0 &&
    !sinSesion
  ) {
    return null;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-2 px-4 pt-4">
      {sinSesion && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-red-200 bg-[var(--color-mal-fondo)] px-4 py-3 text-sm text-[var(--color-mal)]">
          <span>
            <span className="font-semibold">
              Las fotos no se pudieron subir:
            </span>{" "}
            {sinSesion} No se perdió ninguna: se suben en cuanto vuelvas a
            entrar.
          </span>
          <Link
            href="/acceso"
            className="ml-auto font-semibold underline underline-offset-2"
          >
            Entrar
          </Link>
        </div>
      )}

      {pendientes > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-[var(--color-alerta-borde)] bg-[var(--color-alerta-fondo)] px-4 py-3 text-sm">
          <span className="font-semibold text-[var(--color-alerta)]">
            {pendientes} foto{pendientes === 1 ? "" : "s"} esperando señal
          </span>
          <span className="text-[var(--color-tinta-2)]">
            {subiendo
              ? "Subiendo…"
              : "Se suben solas cuando vuelva la conexión. Podés cerrar y seguir después."}
          </span>
          {!subiendo && (
            <button
              type="button"
              className="ml-auto rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-amber-100"
              onClick={() => void procesar()}
            >
              Reintentar ahora
            </button>
          )}
        </div>
      )}

      {subidas.map((s) => (
        <div
          key={s.planillaId}
          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900"
        >
          <span>
            Se subió <span className="font-medium">{s.nombre}</span>.
          </span>
          <Link
            href={`/revisar/${s.planillaId}`}
            className="font-medium underline underline-offset-2"
          >
            Revisarla
          </Link>
          <button
            type="button"
            className="ml-auto text-xs text-green-800 underline underline-offset-2"
            onClick={() =>
              setSubidas((p) => p.filter((x) => x.planillaId !== s.planillaId))
            }
          >
            Ocultar
          </button>
        </div>
      ))}

      {rechazos.map((r, i) => (
        <div
          key={`${r.nombre}-${i}`}
          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          <span>
            <span className="font-medium">{r.nombre}</span>: {r.motivo}
          </span>
          <button
            type="button"
            className="ml-auto text-xs text-red-800 underline underline-offset-2"
            onClick={() => setRechazos((p) => p.filter((_, j) => j !== i))}
          >
            Ocultar
          </button>
        </div>
      ))}
    </div>
  );
}
