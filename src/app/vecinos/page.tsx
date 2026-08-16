import { prisma } from "@/lib/prisma";
import { requerirUsuario } from "@/lib/sesion";
import { formatearMomento } from "@/lib/fechas";
import { etiquetaDeFalla } from "@/lib/reclamos-vecinales";
import { AccionesReclamoVecinal } from "@/components/AccionesReclamoVecinal";

export const dynamic = "force-dynamic";

/**
 * Los reclamos que cargaron los vecinos, para el municipio.
 *
 * Es la bandeja de entrada: lo que está esperando que alguien lo pase al
 * sistema oficial va arriba, porque es lo único con urgencia.
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="titulo-pagina">Reclamos de vecinos</h1>
        <p className="bajada mt-1.5">
          Lo que cargó la gente desde la calle. Pasalo al sistema oficial y
          anotá acá el N.º de incidente que te devuelve.
        </p>
      </div>

      <section className="tarjeta overflow-hidden">
        <div className="tarjeta-titulo">
          <h2 className="text-sm font-semibold">
            Esperando que los cargues ({pendientes.length})
          </h2>
        </div>

        {pendientes.length === 0 ? (
          <p className="py-12 text-center text-sm text-[var(--color-tinta-3)]">
            No hay reclamos esperando. Todo al día.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--color-borde)]">
            {pendientes.map((r) => (
              <li key={r.id} className="p-4">
                <Ficha reclamo={r} />
              </li>
            ))}
          </ul>
        )}
      </section>

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

function Ficha({
  reclamo,
}: {
  reclamo: {
    codigo: string;
    tipo: "NO_FUNCIONA" | "ENCENDIDA" | "INTERMITENTE";
    localidad: string;
    calle: string;
    numero: string;
    observacion: string;
    creadoEn: Date;
  };
}) {
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
