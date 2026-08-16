import type { Metadata } from "next";
import Link from "next/link";

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
};

export default function LayoutVecino({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
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
          <span>Municipalidad de La Costa · Alumbrado público</span>
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
