import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Registro de tareas",
  description:
    "Digitalización de planillas de mantenimiento: foto, lectura con IA, revisión y exportación a Excel.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1d4ed8",
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
            <div className="flex items-center gap-1 text-sm">
              <Link
                href="/"
                className="rounded-md px-3 py-2 hover:bg-slate-100"
              >
                Cargar
              </Link>
              <Link
                href="/registros"
                className="rounded-md px-3 py-2 hover:bg-slate-100"
              >
                Registros
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
