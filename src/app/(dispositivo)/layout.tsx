import type { Metadata } from "next";

/**
 * Marco de la pantalla del celular de cuadrilla.
 *
 * Deliberadamente mínimo: un encabezado y nada más. **No lleva la navegación
 * del municipio** —ni Cargar, ni Registros, ni Stock— porque este teléfono es
 * de la cuadrilla y no tiene por qué llegar a ninguna de esas pantallas. Que
 * los enlaces no existan es una capa más, además del portón que ya los bloquea.
 */

export const metadata: Metadata = {
  title: "Mi cuadrilla",
  description: "Los reclamos de alumbrado de tu zona.",
};

export default function LayoutDispositivo({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-[var(--color-borde)] bg-white">
        <div className="mx-auto flex max-w-2xl items-center gap-2.5 px-4 py-3.5">
          <span
            className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--color-acento)]"
            aria-hidden="true"
          >
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
          <span className="text-[0.9375rem] font-semibold tracking-tight">
            Alumbrado · Mi cuadrilla
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
