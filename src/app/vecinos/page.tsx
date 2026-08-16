import { prisma } from "@/lib/prisma";
import { requerirUsuario } from "@/lib/sesion";
import { formatearMomento } from "@/lib/fechas";
import { etiquetaDeFalla } from "@/lib/reclamos-vecinales";
import { CUADRILLAS } from "@/lib/cuadrillas";
import { AccionesReclamoVecinal } from "@/components/AccionesReclamoVecinal";

export const dynamic = "force-dynamic";

type Fila = {
  id: string;
  codigo: string;
  tipo: "NO_FUNCIONA" | "ENCENDIDA" | "INTERMITENTE";
  localidad: string;
  calle: string;
  numero: string;
  observacion: string;
  cuadrilla: number | null;
  creadoEn: Date;
};

/**
 * Los reclamos que cargaron los vecinos, para el municipio.
 *
 * Se agrupan **por cuadrilla**, no por fecha: así cada equipo ve de una lo que
 * le toca, y quien reparte el trabajo del día no tiene que leer localidad por
 * localidad para saber a quién mandarle cada cosa.
 */
export default async function PaginaVecinos() {
  await requerirUsuario();

  const [pendientes, resueltos] = await Promise.all([
    prisma.reclamoVecinal.findMany({
      where: { estado: "RECIBIDO" },
      orderBy: { creadoEn: "asc" },
    }),
    prisma.reclamoVecinal.findMany({
      where: { estado: { in: ["DERIVADO", "DESCARTADO"] } },
      orderBy: { creadoEn: "desc" },
      take: 50,
    }),
  ]);

  const porCuadrilla = CUADRILLAS.map((c) => ({
    ...c,
    reclamos: pendientes.filter((r) => r.cuadrilla === c.numero),
  }));

  // Los que no cayeron en ninguna zona no se pierden: van al final, aparte.
  const sinZona = pendientes.filter((r) => r.cuadrilla === null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="titulo-pagina">Reclamos de vecinos</h1>
        <p className="bajada mt-1.5">
          Lo que cargó la gente desde la calle, repartido por zona. Pasalo al
          sistema oficial y anotá acá el N.º de incidente que te devuelve.
        </p>
      </div>

      <ZonasDeTrabajo />

      {pendientes.length === 0 ? (
        <p className="tarjeta py-14 text-center text-sm text-[var(--color-tinta-3)]">
          No hay reclamos esperando. Todo al día.
        </p>
      ) : (
        porCuadrilla.map((c) => (
          <section key={c.numero} className="tarjeta overflow-hidden">
            <div className="tarjeta-titulo">
              <div>
                <h2 className="text-sm font-semibold">
                  Cuadrilla {c.numero} · Móvil {c.numero}
                </h2>
                <p className="mt-0.5 text-xs text-[var(--color-tinta-3)]">
                  {c.zona}
                </p>
              </div>
              <span
                className={`etiqueta ${
                  c.reclamos.length > 0
                    ? "bg-[var(--color-acento-suave)] text-[var(--color-acento)]"
                    : "bg-slate-100 text-[var(--color-tinta-3)]"
                }`}
              >
                {c.reclamos.length} pendiente
                {c.reclamos.length === 1 ? "" : "s"}
              </span>
            </div>

            {c.reclamos.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--color-tinta-3)]">
                Sin reclamos en esta zona.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--color-borde)]">
                {c.reclamos.map((r) => (
                  <li key={r.id} className="p-4">
                    <Ficha reclamo={r} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))
      )}

      {sinZona.length > 0 && (
        <section className="tarjeta overflow-hidden border-[var(--color-alerta-borde)]">
          <div className="tarjeta-titulo bg-[var(--color-alerta-fondo)]">
            <h2 className="text-sm font-semibold text-[var(--color-alerta)]">
              Sin zona asignada ({sinZona.length})
            </h2>
            <p className="text-xs text-[var(--color-tinta-2)]">
              La localidad no está en ninguna zona. Hay que verlos a mano.
            </p>
          </div>
          <ul className="divide-y divide-[var(--color-borde)]">
            {sinZona.map((r) => (
              <li key={r.id} className="p-4">
                <Ficha reclamo={r} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {resueltos.length > 0 && (
        <section className="tarjeta overflow-hidden">
          <div className="tarjeta-titulo">
            <h2 className="text-sm font-semibold">Ya resueltos</h2>
          </div>
          <ul className="divide-y divide-[var(--color-borde)]">
            {resueltos.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm"
              >
                <span className="font-medium tabular-nums">{r.codigo}</span>
                {r.cuadrilla && (
                  <span className="text-xs text-[var(--color-tinta-3)]">
                    Cuadrilla {r.cuadrilla}
                  </span>
                )}
                <span className="text-[var(--color-tinta-2)]">
                  {r.calle} {r.numero}, {r.localidad}
                </span>
                <span
                  className={`etiqueta ${
                    r.estado === "DERIVADO"
                      ? "bg-[var(--color-bien-fondo)] text-[var(--color-bien)]"
                      : "bg-slate-100 text-[var(--color-tinta-2)]"
                  }`}
                >
                  {r.estado === "DERIVADO"
                    ? `N.º ${r.nroIncidente}`
                    : "Descartado"}
                </span>
                <span className="ml-auto text-xs text-[var(--color-tinta-3)]">
                  {formatearMomento(r.creadoEn)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/**
 * El reparto de zonas, a la vista.
 *
 * Está acá y no sólo en el código porque es información que necesita quien
 * usa la app, no quien la programa: al ver un reclamo mal derivado, lo primero
 * que hay que poder consultar es qué zona cubre cada cuadrilla.
 */
function ZonasDeTrabajo() {
  return (
    <details className="tarjeta group overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition hover:bg-slate-50/70">
        <span className="text-sm font-semibold">Zonas de trabajo</span>
        <span className="text-sm text-[var(--color-tinta-3)]">
          Qué localidades cubre cada cuadrilla
        </span>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="ml-auto shrink-0 text-[var(--color-tinta-3)] transition group-open:rotate-180"
          aria-hidden="true"
        >
          <path d="M6 9.5 12 15l6-5.5" />
        </svg>
      </summary>

      <div className="grid gap-px border-t border-[var(--color-borde)] bg-[var(--color-borde)] sm:grid-cols-2">
        {CUADRILLAS.map((c) => (
          <div key={c.numero} className="bg-white p-4">
            <p className="text-sm font-semibold">
              Cuadrilla {c.numero}
              <span className="ml-2 font-normal text-[var(--color-tinta-3)]">
                Móvil {c.numero}
              </span>
            </p>
            <p className="mt-0.5 text-xs text-[var(--color-tinta-2)]">{c.zona}</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {c.localidades.map((l) => (
                <li
                  key={l}
                  className="rounded-full bg-[var(--color-fondo)] px-2.5 py-1 text-xs"
                >
                  {l}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}

function Ficha({ reclamo }: { reclamo: Fila }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="etiqueta bg-[var(--color-acento-suave)] text-[var(--color-acento)]">
          {etiquetaDeFalla(reclamo.tipo)}
        </span>
        <span className="text-sm font-semibold">
          {reclamo.calle} {reclamo.numero}
        </span>
        <span className="text-sm text-[var(--color-tinta-2)]">
          {reclamo.localidad}
        </span>
        <span className="ml-auto text-xs tabular-nums text-[var(--color-tinta-3)]">
          {reclamo.codigo} · {formatearMomento(reclamo.creadoEn)}
        </span>
      </div>

      <p className="rounded-lg bg-[var(--color-fondo)] px-3 py-2 text-sm text-[var(--color-tinta-2)]">
        {reclamo.observacion}
      </p>

      <AccionesReclamoVecinal codigo={reclamo.codigo} />
    </div>
  );
}
