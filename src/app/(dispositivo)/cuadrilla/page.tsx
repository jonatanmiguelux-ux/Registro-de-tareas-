import { prisma } from "@/lib/prisma";
import { dispositivoActual } from "@/lib/dispositivo";
import { formatearMomento } from "@/lib/fechas";
import { etiquetaDeFalla } from "@/lib/reclamos-vecinales";
import { describirZona } from "@/lib/cuadrillas";
import { AnotarIncidente } from "@/components/AnotarIncidente";

export const dynamic = "force-dynamic";

/**
 * La pantalla del celular de la cuadrilla.
 *
 * Muestra los reclamos de vecinos de **su** zona: foto, dirección y localidad,
 * y un campo para anotar el N.º de incidente. Nada más: este teléfono no puede
 * ver planillas, stock ni las otras cuadrillas.
 *
 * La cuadrilla sale de la galleta del dispositivo, validada contra la base. Si
 * el celular no está activado —o se le regeneró el enlace— se explica cómo
 * activarlo, sin filtrar ningún dato.
 */
export default async function PaginaCuadrillaDispositivo({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const dispositivo = await dispositivoActual();
  const { error } = await searchParams;

  if (!dispositivo) {
    return (
      <div className="tarjeta p-6 text-center">
        <h1 className="text-lg font-semibold">Este celular no está activado</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-tinta-2)]">
          {error === "enlace"
            ? "El enlace no es válido o fue desactivado. Pedile a quien administra el sistema el enlace nuevo de tu cuadrilla."
            : "Para ver los reclamos de tu zona, pedile a quien administra el sistema el enlace de tu cuadrilla y abrilo en este teléfono."}
        </p>
      </div>
    );
  }

  const nro = dispositivo.cuadrilla;

  const [pendientes, resueltos] = await Promise.all([
    prisma.reclamoVecinal.findMany({
      where: { cuadrilla: nro, estado: "RECIBIDO" },
      orderBy: { creadoEn: "asc" },
      select: {
        codigo: true,
        tipo: true,
        localidad: true,
        calle: true,
        numero: true,
        observacion: true,
        creadoEn: true,
      },
    }),
    prisma.reclamoVecinal.findMany({
      where: { cuadrilla: nro, estado: "DERIVADO" },
      orderBy: { derivadoEn: "desc" },
      take: 20,
      select: {
        codigo: true,
        calle: true,
        numero: true,
        localidad: true,
        nroIncidente: true,
        creadoEn: true,
      },
    }),
  ]);

  const zona = describirZona(dispositivo.localidades);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.01em]">Cuadrilla {nro}</h1>
        <p className="mt-1 text-sm text-[var(--color-tinta-2)]">
          {zona ? `Tu zona: ${zona}.` : ""} Cuando cargues un reclamo en el
          sistema, anotá acá el N.º de incidente.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Para atender</h2>
        <span
          className={`etiqueta ${
            pendientes.length > 0
              ? "bg-[var(--color-acento-suave)] text-[var(--color-acento)]"
              : "bg-slate-100 text-[var(--color-tinta-3)]"
          }`}
        >
          {pendientes.length} pendiente{pendientes.length === 1 ? "" : "s"}
        </span>
      </div>

      {pendientes.length === 0 ? (
        <p className="tarjeta py-10 text-center text-sm text-[var(--color-tinta-3)]">
          No hay reclamos esperando en tu zona.
        </p>
      ) : (
        <ul className="space-y-3">
          {pendientes.map((r) => (
            <li key={r.codigo} className="tarjeta overflow-hidden">
              {/* La foto de la luminaria, lo primero que necesita la cuadrilla
                  para encontrar el poste. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/reclamos-vecinales/${r.codigo}/foto`}
                alt={`Foto del reclamo en ${r.calle} ${r.numero}`}
                className="max-h-64 w-full bg-slate-100 object-cover"
                loading="lazy"
              />
              <div className="space-y-3 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="etiqueta bg-[var(--color-acento-suave)] text-[var(--color-acento)]">
                    {etiquetaDeFalla(r.tipo)}
                  </span>
                  <span className="text-base font-semibold">
                    {r.calle} {r.numero}
                  </span>
                  <span className="text-sm text-[var(--color-tinta-2)]">
                    {r.localidad}
                  </span>
                </div>

                <p className="rounded-lg bg-[var(--color-fondo)] px-3 py-2 text-sm text-[var(--color-tinta-2)]">
                  {r.observacion}
                </p>

                <div className="flex items-center justify-between text-xs text-[var(--color-tinta-3)]">
                  <span className="tabular-nums">{r.codigo}</span>
                  <span>{formatearMomento(r.creadoEn)}</span>
                </div>

                <AnotarIncidente codigo={r.codigo} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {resueltos.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">Ya cargados</h2>
          <ul className="tarjeta divide-y divide-[var(--color-borde)] overflow-hidden">
            {resueltos.map((r) => (
              <li
                key={r.codigo}
                className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm"
              >
                <span className="font-medium">
                  {r.calle} {r.numero}
                </span>
                <span className="text-[var(--color-tinta-2)]">
                  {r.localidad}
                </span>
                <span className="etiqueta ml-auto bg-[var(--color-bien-fondo)] text-[var(--color-bien)]">
                  N.º {r.nroIncidente}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
