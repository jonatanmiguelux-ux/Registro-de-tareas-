"use client";

import { useEffect } from "react";

/**
 * Registra el service worker, que es lo que hace instalable la app.
 *
 * En desarrollo no se registra: el service worker cachearía los archivos que
 * Next reescribe en cada guardado y habría que limpiarlo a mano para ver los
 * cambios. Si ya quedó uno instalado de una prueba anterior, se da de baja.
 *
 * El navegador sólo lo acepta en `localhost` o sobre HTTPS. En HTTP contra la
 * IP de la red no falla ruidosamente: simplemente no hay `serviceWorker` en
 * `navigator` y la app sigue andando como sitio web común.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((registros) => registros.forEach((r) => r.unregister()))
        .catch(() => {});
      return;
    }

    // Después de que cargue la página: registrarlo antes compite por ancho de
    // banda con lo que la persona está esperando ver.
    const registrar = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Que no se pueda instalar no rompe nada: la app funciona igual
        // abierta desde el navegador.
      });
    };

    if (document.readyState === "complete") registrar();
    else {
      window.addEventListener("load", registrar);
      return () => window.removeEventListener("load", registrar);
    }
  }, []);

  return null;
}
