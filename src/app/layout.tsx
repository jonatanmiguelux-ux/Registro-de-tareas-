import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { ServiceWorker } from "@/components/ServiceWorker";
import { ColaOffline } from "@/components/ColaOffline";

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
        <header className="sticky top-0 z-10 border-b border-[var(--color-borde)] bg-white/90 backdrop-blur">
          <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/" className="text-base font-semibold tracking-tight">
              Registro de tareas
            </Link>
            <div className="-mr-1 flex items-center gap-0.5 overflow-x-auto text-sm">
              {[
                { href: "/", texto: "Cargar" },
                { href: "/registros", texto: "Registros" },
                { href: "/tablero", texto: "Tablero" },
                { href: "/stock", texto: "Stock" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="shrink-0 rounded-md px-3 py-2 hover:bg-slate-100"
                >
                  {item.texto}
                </Link>
              ))}
            </div>
          </nav>
        </header>
        <ColaOffline />
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <ServiceWorker />
      </body>
    </html>
  );
}
