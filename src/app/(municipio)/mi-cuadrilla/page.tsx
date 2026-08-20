import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requerirUsuario } from "@/lib/sesion";
import { formatearMomento } from "@/lib/fechas";
import { etiquetaDeFalla } from "@/lib/reclamos-vecinales";
import { describirZona } from "@/lib/cuadrillas";
import { listarCuadrillas } from "@/lib/cuadrillas-db";
import { AccionesReclamoVecinal } from "@/components/AccionesReclamoVecinal";

export const dynamic = "force-dynamic";

/**
 * Los reclamos de vecinos de **mi** cuadrilla, y sólo de la mía.
 *
 * A diferencia de la pantalla Vecinos —que muestra todas las cuadrillas juntas,
 * para quien coordina—, ésta filtra por la cuadrilla asignada a quien entró. El
 * administrador asigna esa cuadrilla desde Cuentas. Así cada equipo ve lo suyo
 * sin que se le mezclen las esquinas de otras zonas.
 *
 * No hace falta control de acceso especial por número: la pantalla lee la
 * cuadrilla de la propia sesión, así que nadie puede ver la de otro escribiendo
 * una dirección a mano.
 */
export default async function PaginaMiCuadrilla() {
  const usuario = await requerirUsuario();

  // Sin cuadrilla asignada no hay nada que filtrar: puede ser alguien de
  // administración o un jefe que mira todo desde Vecinos.
  if (usuario.cuadrilla === null) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="titulo-pagina">Mi cuadrilla</h1>
        </div>
        <div className="tarjeta p-6 text-center">
          <p className="text-sm text-[var(--color-tinta-2)]">
            Todavía no tenés una cuadrilla asignada. Pedile a quien administra
            el sistema que te asigne una desde Cuentas.
          </p>
          <Link
            href="/vecinos"
            className="mt-4 inline-block text-sm font-medium text-[var(--color-acento)] hover:underline"
          >
            Ver todos los reclamos de vecinos
          </Link>
        </div>
      </div>
    );
  }

  const nro = usuario.cuadrilla;

  const [pendientes, resueltos, cuadrillas] = await Promise.all([
    prisma.reclamoVecinal.findMany({
      where: { cuadrilla: nro, estado: "RECIBIDO" },
      orderBy: { creadoEn: "asc" },
    }),
    prisma.reclamoVecinal.findMany({
      where: { cuadrilla: nro, estado: { in: ["DERIVADO", "DESCARTADO"] } },
      orderBy: { creadoEn: "desc" },
      take: 30,
    }),
    listarCuadrillas(),
  ]);

  const miCuadrilla = cuadrillas.find((c) => c.numero === nro);
  const zona = miCuadrilla ? describirZona(miCuadrilla.localidades) : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="titulo-pagina">Cuadrilla {nro}</h1>
        <p className="bajada mt-1.5">
          Los reclamos de tu zona{zona ? `: ${zona}` : ""}. Cuando lo cargues en
          el sistema oficial, anotá acá el N.º de incidente que te devuelve.
        </p>
      </div>

      <section className="tarjeta overflow-hidden">
        <div className="tarjeta-titulo">
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
          <p className="py-10 text-center text-sm text-[var(--color-tinta-3)]">
            No hay reclamos esperando en tu zona. Todo al día.
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
                className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm"
              >
                <span className="font-medium">
                  {r.calle} {r.numero}
                </span>
                <span className="text-[var(--color-tinta-2)]">
                  {r.localidad}
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

type Fila = {
  codigo: string;
  tipo: "NO_FUNCIONA" | "ENCENDIDA" | "INTERMITENTE";
  localidad: string;
  calle: string;
  numero: string;
  observacion: string;
  creadoEn: Date;
};

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
