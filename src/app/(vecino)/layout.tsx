import type { Metadata } from "next";
import Link from "next/link";
import { MenuVecino } from "@/components/MenuVecino";
import { NOMBRE_MUNICIPIO } from "@/config/municipio";

/**
 * La app del vecino.
 *
 * Deliberadamente **no comparte nada visible** con la del municipio: ni el
 * nombre "Registro de tareas", ni la navegación, ni el acceso. Quien entra
 * acá viene a reportar una luz quemada y no tiene por qué enterarse de que
 * del otro lado hay un sistema de planillas, stock y cuadrillas.
 *
 * Tampoco lleva service worker ni cola de fotos sin señal: eso es para la
 * cuadrilla, que usa la app todos los días. El vecino entra una vez.
 */

export const metadata: Metadata = {
  title: {
    default: "Alumbrado público",
    template: "%s · Alumbrado público",
  },
  description:
    "Reportá una luminaria que no funciona sin tener que ir a la delegación.",
  formatDetection: { telephone: false },
  // Manifest PROPIO del vecino: su nombre, su ícono verde y que abra en la
  // pantalla de reportar, no en la de planillas del municipio. Sobreescribe
  // al del municipio, que sólo se enlaza del otro lado.
  manifest: "/vecino.webmanifest",
  // iOS no lee el manifest: la app instalada desde Safari toma el ícono y el
  // nombre de acá.
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Alumbrado",
  },
  icons: {
    // El favicon de la pestaña: la farola verde, distinto al del municipio.
    // El de 32 está simplificado para que se lea a ese tamaño; los grandes
    // son para cuando el navegador necesita más resolución.
    icon: [
      { url: "/icono/vecino-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icono/vecino-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icono/vecino-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icono/vecino-apple.png",
  },
};

export default function LayoutVecino({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="tema-vecino flex min-h-dvh flex-col">
      <header className="border-b border-[var(--color-borde)] bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-2.5 px-4 py-3.5">
          <Link
            href="/alumbrado"
            className="flex items-center gap-2.5 text-[0.9375rem] font-semibold tracking-tight"
          >
            <Farola />
            Alumbrado público
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        {children}
      </main>

      <footer className="border-t border-[var(--color-borde)] bg-white">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-4 text-xs text-[var(--color-tinta-3)]">
          <span>{NOMBRE_MUNICIPIO} · Alumbrado público</span>
          <Link href="/reclamar" className="font-medium text-[var(--color-acento)]">
            Reportar una luminaria
          </Link>
        </div>
      </footer>
    </div>
  );
}

function Farola() {
  return (
    <span
      className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--color-acento)]"
      aria-hidden="true"
    >
      {/* Lamparita encendida, igual que el ícono de la app: un bulbo con sus
          rayos y la base. */}
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
