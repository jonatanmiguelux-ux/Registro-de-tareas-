import { prisma } from "@/lib/prisma";
import { requerirUsuario } from "@/lib/sesion";
import { formatearMomento } from "@/lib/fechas";
import { etiquetaDeFalla } from "@/lib/reclamos-vecinales";
import { describirZona } from "@/lib/cuadrillas";
import { listarCuadrillas } from "@/lib/cuadrillas-db";
import Link from "next/link";
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

  const [pendientes, resueltos, cuadrillas] = await Promise.all([
    prisma.reclamoVecinal.findMany({
      where: { estado: "RECIBIDO" },
      orderBy: { creadoEn: "asc" },
    }),
    prisma.reclamoVecinal.findMany({
      where: { estado: { in: ["DERIVADO", "DESCARTADO"] } },
      orderBy: { creadoEn: "desc" },
      take: 50,
    }),
    listarCuadrillas(),
  ]);

  const porCuadrilla = cuadrillas.map((c) => ({
    ...c,
    zona: describirZona(c.localidades),
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
          sistema oficial y anotá acá el N.º de incidente que te devuelve.{" "}
          <Link
            href="/cuadrillas"
            className="font-medium text-[var(--color-acento)] hover:underline"
          >
            Ver o cambiar el reparto
          </Link>
          .
        </p>
      </div>


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
