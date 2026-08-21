"use client";

import { useEffect, useState } from "react";

/**
 * El control de instalación de la página de descarga del vecino.
 *
 * Instalar una app web no es igual en todos lados, así que esto se adapta a
 * dónde está la persona:
 *
 * - **Android/Chrome:** el navegador avisa cuando se puede instalar (evento
 *   `beforeinstallprompt`). Mostramos un botón grande que lo dispara.
 * - **iPhone:** ese evento no existe; se instala a mano desde Compartir →
 *   "Agregar a inicio". Mostramos el instructivo.
 * - **Ya instalada:** no se ofrece instalar de nuevo; se felicita y se manda a
 *   reportar.
 * - **Computadora:** no se instala en el escritorio. Se invita a usar el
 *   código QR de la página para pasar al teléfono.
 *
 * También registra el service worker del vecino, que es lo que habilita la
 * instalación. Todo esto es "de más": si algo no anda, la página sigue siendo
 * un sitio web común y el vecino puede reportar igual.
 */

// El evento del navegador no está en los tipos estándar; se declara lo justo.
type EventoInstalar = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Estado = "cargando" | "instalada" | "android" | "ios" | "escritorio";

export function DescargarApp() {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [evento, setEvento] = useState<EventoInstalar | null>(null);
  const [mostrarPasosIOS, setMostrarPasosIOS] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw-vecino.js").catch(() => {});
    }

    const yaEsApp =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    if (yaEsApp) {
      setEstado("instalada");
      return;
    }

    const ua = window.navigator.userAgent;
    if (/iphone|ipad|ipod/i.test(ua)) {
      setEstado("ios");
    } else {
      // Ni iPhone ni (todavía) el evento de Android: se asume escritorio.
      // Si llega el evento, la línea de abajo lo corrige a "android".
      setEstado("escritorio");
    }

    const alPoder = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalar);
      setEstado("android");
    };
    window.addEventListener("beforeinstallprompt", alPoder);

    const alInstalar = () => setEstado("instalada");
    window.addEventListener("appinstalled", alInstalar);

    return () => {
      window.removeEventListener("beforeinstallprompt", alPoder);
      window.removeEventListener("appinstalled", alInstalar);
    };
  }, []);

  async function instalar() {
    if (!evento) return;
    await evento.prompt();
    await evento.userChoice;
    setEvento(null);
  }

  if (estado === "cargando") {
    // Un placeholder de la misma altura para que no salte la página al decidir.
    return <div className="min-h-[7.5rem]" aria-hidden="true" />;
  }

  if (estado === "instalada") {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-[var(--color-acento)] bg-[var(--color-acento-suave)] p-5">
        <IconoTilde />
        <div>
          <p className="font-semibold text-[var(--color-acento-oscuro)]">
            Ya tenés la app instalada
          </p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--color-tinta-2)]">
            La próxima vez que veas una luz quemada, abrila desde el ícono y
            reportala en un toque.
          </p>
          <a href="/reclamar" className="boton-primario mt-4">
            Reportar una luminaria
          </a>
        </div>
      </div>
    );
  }

  if (estado === "android") {
    return (
      <div>
        <button type="button" onClick={instalar} className="boton-primario w-full text-base">
          <IconoBajar />
          Instalar la app ahora
        </button>
        <p className="mt-3 text-center text-sm text-[var(--color-tinta-2)]">
          Se agrega a la pantalla de inicio. No ocupa casi nada y no pasa por
          ninguna tienda.
        </p>
      </div>
    );
  }

  if (estado === "ios") {
    return (
      <div>
        <button
          type="button"
          onClick={() => setMostrarPasosIOS((v) => !v)}
          className="boton-primario w-full text-base"
        >
          <IconoManzana />
          Cómo instalarla en iPhone
        </button>
        {mostrarPasosIOS && (
          <ol className="mt-4 space-y-3">
            {[
              <>
                Tocá el botón de <strong>Compartir</strong> (el cuadradito con la
                flecha hacia arriba, abajo en la pantalla).
              </>,
              <>
                Deslizá el menú y elegí <strong>Agregar a inicio</strong>.
              </>,
              <>
                Tocá <strong>Agregar</strong> arriba a la derecha. Listo: queda el
                ícono en tu teléfono.
              </>,
            ].map((paso, i) => (
              <li key={i} className="flex gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--color-acento)] text-xs font-bold text-white">
                  {i + 1}
                </span>
                <span className="text-sm leading-relaxed text-[var(--color-tinta-2)]">
                  {paso}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    );
  }

  // Escritorio: no se instala acá; se manda al QR.
  return (
    <div className="flex items-start gap-3 rounded-xl border border-dashed border-[var(--color-borde-fuerte)] bg-white p-5">
      <IconoCompu />
      <div>
        <p className="font-semibold">Estás en una computadora</p>
        <p className="mt-1 text-sm leading-relaxed text-[var(--color-tinta-2)]">
          La app se instala en el teléfono. Escaneá el código de acá al lado con
          la cámara de tu celular y seguí desde ahí.
        </p>
      </div>
    </div>
  );
}

function IconoTilde() {
  return (
    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--color-acento)] text-white">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </span>
  );
}

function IconoBajar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
    </svg>
  );
}

function IconoManzana() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.4 12.9c0-2 1.6-3 1.7-3-1-1.3-2.4-1.5-2.9-1.6-1.3-.1-2.4.7-3 .7-.6 0-1.6-.7-2.6-.7-1.3 0-2.6.8-3.2 2-1.4 2.4-.4 6 1 8 .7 1 1.4 2 2.4 2 1 0 1.3-.6 2.5-.6s1.5.6 2.5.6 1.7-1 2.3-2c.7-1 1-2 1-2-.1 0-2.2-.9-2.2-3.4zM14.6 6.3c.5-.7.9-1.6.8-2.5-.8 0-1.7.5-2.3 1.2-.5.6-.9 1.5-.8 2.4.9.1 1.8-.4 2.3-1.1z" />
    </svg>
  );
}

function IconoCompu() {
  return (
    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--color-acento-suave)] text-[var(--color-acento)]">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="4" width="20" height="13" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    </span>
  );
}
