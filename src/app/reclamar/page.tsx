import type { Metadata } from "next";
import { FormularioVecino } from "@/components/FormularioVecino";

export const metadata: Metadata = {
  title: "Reclamar una luminaria",
  description:
    "Reportá una luminaria que no funciona sin tener que ir a la delegación.",
};

/**
 * Pantalla pública para vecinos.
 *
 * Es la única de la app abierta sin sesión: cualquiera que tenga el enlace
 * entra. Por eso no muestra nada del municipio —ni planillas, ni stock, ni
 * quién trabaja— y sólo sabe crear reclamos.
 */
export default function PaginaReclamar() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="titulo-pagina">Reclamar una luminaria</h1>
        <p className="bajada mt-2">
          Contanos qué luz está fallando y dónde. No hace falta que vayas a la
          delegación ni que crees ninguna cuenta.
        </p>
      </div>

      <div className="tarjeta p-5 sm:p-6">
        <FormularioVecino />
      </div>

      <div className="rounded-[var(--radius-tarjeta)] border border-[var(--color-borde)] bg-white/60 p-4">
        <h2 className="text-sm font-semibold">Qué pasa después</h2>
        <ol className="mt-2 space-y-1.5 text-sm text-[var(--color-tinta-2)]">
          <li>
            <span className="font-medium text-[var(--color-tinta)]">1.</span>{" "}
            Te llega un código por correo y lo confirmás. Eso evita reclamos
            falsos.
          </li>
          <li>
            <span className="font-medium text-[var(--color-tinta)]">2.</span>{" "}
            El municipio lo carga en el sistema y te queda un número de
            incidente.
          </li>
          <li>
            <span className="font-medium text-[var(--color-tinta)]">3.</span>{" "}
            La cuadrilla lo recibe junto con el resto del trabajo del día.
          </li>
        </ol>
        <p className="mt-3 text-xs text-[var(--color-tinta-3)]">
          Guardá el número de seguimiento que te vamos a dar: con eso podés ver
          en qué estado quedó tu reclamo.
        </p>
      </div>
    </div>
  );
}
