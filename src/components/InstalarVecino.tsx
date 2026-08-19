"use client";

import { useEffect, useState } from "react";

/**
 * "Instalar la app" para el vecino.
 *
 * Instalar una app web no es igual en todos lados, y esa es la razon de que
 * esto sea mas que un boton:
 *
 * - En Android/Chrome el navegador avisa cuando se puede instalar (el evento
 *   `beforeinstallprompt`). Ahi mostramos un boton que lo dispara.
 * - En iPhone NO existe ese evento: se instala a mano desde Compartir ->
 *   "Agregar a inicio". Para esos, mostramos el instructivo.
 * - Si ya esta instalada (se abrio como app, sin barra del navegador), no se
 *   muestra nada: seria ofrecer instalar algo que ya esta.
 *
 * Tambien registra el service worker del vecino, que es lo que habilita la
 * instalacion. Todo esto es "de mas": si algo no anda, la pagina sigue
 * funcionando como sitio web comun.
 */

// El evento del navegador no esta en los tipos estandar; se declara lo justo.
type EventoInstalar = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstalarVecino() {
  const [evento, setEvento] = useState<EventoInstalar | null>(null);
  const [instalada, setInstalada] = useState(false);
  const [esIOS, setEsIOS] = useState(false);
  const [mostrarPasosIOS, setMostrarPasosIOS] = useState(false);

  useEffect(() => {
    // Registrar el service worker (solo en produccion y sobre HTTPS).
    if (
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker.register("/sw-vecino.js").catch(() => {});
    }

    // ¿Ya esta instalada? Entonces no ofrecemos instalarla.
    const yaEsApp =
      window.matchMedia("(display-mode: standalone)").matches ||
      // Safari en iOS usa esta bandera propia.
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    if (yaEsApp) {
      setInstalada(true);
      return;
    }

    // Detectar iPhone/iPad, que no tienen el boton automatico.
    const ua = window.navigator.userAgent;
    const iOS = /iphone|ipad|ipod/i.test(ua);
    setEsIOS(iOS);

    // Android: guardar el evento para dispararlo con el boton.
    const alPoder = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalar);
    };
    window.addEventListener("beforeinstallprompt", alPoder);

    // Cuando termina de instalarse, ocultar todo.
    const alInstalar = () => setInstalada(true);
    window.addEventListener("appinstalled", alInstalar);

    return () => {
      window.removeEventListener("beforeinstallprompt", alPoder);
      window.removeEventListener("appinstalled", alInstalar);
    };
  }, []);

  if (instalada) return null;

  async function instalar() {
    if (!evento) return;
    await evento.prompt();
    await evento.userChoice;
    setEvento(null);
  }

  // Nada para mostrar: ni es iPhone ni el navegador ofrecio instalar todavia.
  // (Puede pasar en una compu de escritorio; ahi no tiene sentido el boton.)
  if (!evento && !esIOS) return null;

  return (
    <section className="tarjeta border-[var(--color-acento)] bg-[var(--color-acento-suave)] p-5">
      <div className="flex items-start gap-3">
        <span
          className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--color-acento)] text-2xl"
          aria-hidden="true"
        >
          📲
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold">
            Tené la app a mano en el celular
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-[var(--color-tinta-2)]">
            Instalala en la pantalla de inicio y la próxima vez que veas una luz
            quemada la reportás en un toque, sin buscar la página.
          </p>

          {/* Android: boton que dispara la instalacion del navegador. */}
          {evento && (
            <button
              type="button"
              onClick={instalar}
              className="boton-primario mt-4"
            >
              Instalar la app
            </button>
          )}

          {/* iPhone: no hay boton, se explica el paso a mano. */}
          {esIOS && !evento && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setMostrarPasosIOS((v) => !v)}
                className="boton-secundario"
              >
                Cómo instalarla en iPhone
              </button>
              {mostrarPasosIOS && (
                <ol className="mt-3 space-y-1.5 pl-5 text-sm text-[var(--color-tinta-2)] list-decimal">
                  <li>
                    Tocá el botón de <strong>Compartir</strong> (el cuadradito
                    con la flecha para arriba, abajo en la pantalla).
                  </li>
                  <li>
                    Deslizá y elegí <strong>Agregar a inicio</strong>.
                  </li>
                  <li>
                    Tocá <strong>Agregar</strong> arriba a la derecha. Listo:
                    queda el ícono en tu teléfono.
                  </li>
                </ol>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
