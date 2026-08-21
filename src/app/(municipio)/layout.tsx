import type { Metadata } from "next";
import Link from "next/link";
import { ServiceWorker } from "@/components/ServiceWorker";
import { ColaOffline } from "@/components/ColaOffline";
import { NavegacionSuperior, NavegacionInferior } from "@/components/Navegacion";
import { MenuUsuario } from "@/components/MenuUsuario";

/**
 * La app del municipio: planillas, tablero, stock y cuentas.
 *
 * Sólo para gente con sesión. Es también la que se instala en el celular de
 * la cuadrilla, así que acá viven el service worker y la cola de fotos sin
 * señal — el vecino entra una vez y no necesita ninguna de las dos.
 */

export const metadata: Metadata = {
  title: "Registro de tareas",
  description:
    "Digitalización de planillas de mantenimiento: foto, lectura con IA, revisión y exportación a Excel.",
  applicationName: "Registro de tareas",
  appleWebApp: {
    // iOS no lee el manifest: la app instalada desde Safari se configura acá.
    capable: true,
    title: "Planillas",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icono/icono-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icono/icono-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icono/icono-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icono/apple-touch-icon.png",
  },
  formatDetection: { telephone: false },
};

export default function LayoutMunicipio({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="sticky top-0 z-10 border-b border-[var(--color-borde)] bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-[0.9375rem] font-semibold tracking-tight"
          >
            <Farola />
            <span>
              Registro de tareas
              <span className="ml-2 hidden text-xs font-medium text-[var(--color-tinta-3)] md:inline">
                Alumbrado público
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <NavegacionSuperior />
            <MenuUsuario />
          </div>
        </div>
      </header>

      <ColaOffline />

      {/* El padding de abajo deja lugar a la barra de pestañas del celular. */}
      <main className="mx-auto max-w-6xl px-4 pt-6 pb-24 sm:pb-10">
        {children}
      </main>

      <NavegacionInferior />
      <ServiceWorker />
    </>
  );
}

/** El mismo dibujo que el ícono de la app, en chico. */
function Farola() {
  return (
    <span
      className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--color-acento)]"
      aria-hidden="true"
    >
      {/* Lamparita encendida, la misma que la app del vecino: un bulbo con
          sus rayos y la base. Acá el fondo es azul (el acento del municipio). */}
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
        <g stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.9">
          <line x1="12" y1="2.4" x2="12" y2="4.4" />
          <line x1="5.2" y1="5.2" x2="6.6" y2="6.6" />
          <line x1="18.8" y1="5.2" x2="17.4" y2="6.6" />
        </g>
        <circle cx="12" cy="11" r="4.8" fill="#fff" />
        <rect x="9.6" y="15.9" width="4.8" height="1.7" rx="0.85" fill="#fff" />
        <rect x="10.4" y="18.2" width="3.2" height="1.6" rx="0.8" fill="#fff" />
      </svg>
    </span>
  );
}
