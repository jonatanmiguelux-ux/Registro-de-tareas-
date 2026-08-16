import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requerirVecino } from "@/lib/sesion";
import { formatearMomento } from "@/lib/fechas";
import { etiquetaDeFalla } from "@/lib/reclamos-vecinales";

export const dynamic = "force-dynamic";

/**
 * Los reclamos de quien está conectado.
 *
 * Es lo que gana el vecino a cambio de registrarse: ve todos los suyos juntos,
 * sin tener que haber guardado el número de seguimiento de cada uno.
 */
export default async function PaginaMisReclamos() {
  const usuario = await requerirVecino();

  const reclamos = await prisma.reclamoVecinal.findMany({
    where: { vecinoId: usuario.id },
    orderBy: { creadoEn: "desc" },
    select: {
      codigo: true,
      tipo: true,
      localidad: true,
      calle: true,
      numero: true,
      estado: true,
      nroIncidente: true,
      creadoEn: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="titulo-pagina">Mis reclamos</h1>
          <p className="bajada mt-1.5">
            Todo lo que reportaste con esta cuenta.
          </p>
        </div>
        <Link href="/reclamar" className="boton-primario">
          Reportar otra
        </Link>
      </div>

      {reclamos.length === 0 ? (
        <div className="tarjeta px-4 py-14 text-center">
          <p className="text-sm text-[var(--color-tinta-2)]">
            Todavía no reportaste ninguna luminaria.
          </p>
          <Link href="/reclamar" className="boton-primario mt-4">
            Reportar la primera
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {reclamos.map((r) => (
            <li key={r.codigo}>
              <Link
                href={`/reclamo/${r.codigo}`}
                className="tarjeta block p-4 transition hover:border-[var(--color-borde-fuerte)]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">
                    {r.calle} {r.numero}
                  </span>
                  <span className="text-sm text-[var(--color-tinta-2)]">
                    {r.localidad}
                  </span>
                  <Estado estado={r.estado} nroIncidente={r.nroIncidente} />
                </div>
                <p className="mt-1 text-xs text-[var(--color-tinta-3)]">
                  {etiquetaDeFalla(r.tipo)} · reportada el{" "}
                  {formatearMomento(r.creadoEn)} · seguimiento{" "}
                  <span className="tabular-nums">{r.codigo}</span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Estado({
  estado,
  nroIncidente,
}: {
  estado: "RECIBIDO" | "DERIVADO" | "DESCARTADO";
  nroIncidente: string | null;
}) {
  const estilo = {
    RECIBIDO: {
      texto: "Recibido",
      clase: "bg-[var(--color-alerta-fondo)] text-[var(--color-alerta)]",
    },
    DERIVADO: {
      texto: nroIncidente ? `N.º ${nroIncidente}` : "En el sistema",
      clase: "bg-[var(--color-bien-fondo)] text-[var(--color-bien)]",
    },
    DESCARTADO: {
      texto: "No siguió",
      clase: "bg-slate-100 text-[var(--color-tinta-2)]",
    },
  }[estado];

  return <span className={`etiqueta ${estilo.clase}`}>{estilo.texto}</span>;
}
