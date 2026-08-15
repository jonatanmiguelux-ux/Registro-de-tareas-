import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { ServiceWorker } from "@/components/ServiceWorker";
import { ColaOffline } from "@/components/ColaOffline";
import { NavegacionSuperior, NavegacionInferior } from "@/components/Navegacion";

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
      { url: "/icono/icono-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icono/icono-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icono/apple-touch-icon.png",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1d4ed8",
  // Instalada, la app ocupa la pantalla completa: sin esto el contenido queda
  // debajo de la muesca y de la barra de gestos en los celulares con notch.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-AR">
      <body className="min-h-dvh antialiased">
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
            <NavegacionSuperior />
          </div>
        </header>

        <ColaOffline />

        {/* El padding de abajo deja lugar a la barra de pestañas del celular. */}
        <main className="mx-auto max-w-6xl px-4 pt-6 pb-24 sm:pb-10">
          {children}
        </main>

        <NavegacionInferior />
        <ServiceWorker />
      </body>
    </html>
  );
}

/** El mismo dibujo que el ícono de la app, en chico. */
function Farola() {
  return (
    <span
      className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--color-acento)]"
      aria-hidden="true"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M7.4 20V8.3q0-2.1 2.1-2.1h1.4"
          stroke="#fff"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path d="M10.6 4.9h5.2l-1.2 3.2h-2.8z" fill="#fff" />
        <path
          d="M11.6 9.6l1.2 1.8M14.9 9.6l-1.2 1.8"
          stroke="#fff"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.7"
        />
        <path
          d="M5.6 20.2h3.6"
          stroke="#fff"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
