import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatearFecha, formatearMomento } from "@/lib/fechas";
import { leerFiltros, wherePlanilla, whereReclamo, hayFiltros, aQueryString } from "@/lib/filtros";
import { cuadrillas } from "@/lib/consultas";
import { BarraFiltros } from "@/components/BarraFiltros";
import { BotonExportar } from "@/components/BotonExportar";
import { BorrarPlanilla } from "@/components/BorrarPlanilla";
import { requerirUsuario, alcanza } from "@/lib/sesion";

export const dynamic = "force-dynamic";

const ETIQUETAS: Record<string, { texto: string; clase: string }> = {
  PROCESANDO: {
    texto: "Procesando",
    clase: "bg-slate-100 text-[var(--color-tinta-2)]",
  },
  EN_REVISION: {
    texto: "En revisión",
    clase: "bg-[var(--color-alerta-fondo)] text-[var(--color-alerta)]",
  },
  CONFIRMADA: {
    texto: "Confirmada",
    clase: "bg-[var(--color-bien-fondo)] text-[var(--color-bien)]",
  },
  ERROR: {
    texto: "Error",
    clase: "bg-[var(--color-mal-fondo)] text-[var(--color-mal)]",
  },
};

/** El nombre de pila alcanza para saber quién fue, y no llena el renglón. */
function nombreCorto(persona: { name: string | null; email: string | null }) {
  return persona.name?.split(" ")[0] ?? persona.email?.split("@")[0] ?? "alguien";
}

/** Agrupa por el día de la planilla; si no tiene fecha, por el día de carga. */
function diaDe(planilla: { fecha: Date | null; creadoEn: Date }): string {
  return planilla.fecha
    ? planilla.fecha.toISOString().slice(0, 10)
    : planilla.creadoEn.toISOString().slice(0, 10);
}

export default async function PaginaRegistros({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const usuario = await requerirUsuario();
  // Borrar una planilla es lo mismo que puede hacer la API: del encargado
  // para arriba.
  const puedeBorrar = alcanza(usuario.rol, "ENCARGADO");
  const filtros = leerFiltros(await searchParams);
  const query = aQueryString(filtros);

  const [planillas, listaCuadrillas, coincidencias] = await Promise.all([
    prisma.planilla.findMany({
      where: wherePlanilla(filtros),
      orderBy: [{ fecha: "desc" }, { creadoEn: "desc" }],
      include: {
        _count: { select: { reclamos: true } },
        // Quién la cargó y quién la confirmó: en un sistema del municipio,
        // poder responder "¿quién dio por buena esta planilla?" importa tanto
        // como el dato en sí.
        cargadaPor: { select: { name: true, email: true } },
        confirmadaPor: { select: { name: true, email: true } },
      },
    }),
    cuadrillas(),
    // Cuando se busca un incidente, lo útil es ver el reclamo directo,
    // no la planilla que lo contiene.
    filtros.incidente
      ? prisma.reclamo.findMany({
          where: whereReclamo(filtros),
          orderBy: [{ fecha: "desc" }],
          take: 50,
          include: {
            planilla: { select: { id: true, archivoNombre: true, estado: true } },
            materiales: { select: { cantidad: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const porDia = new Map<string, typeof planillas>();
  for (const planilla of planillas) {
    const dia = diaDe(planilla);
    porDia.set(dia, [...(porDia.get(dia) ?? []), planilla]);
  }
  const dias = [...porDia].sort((a, b) => b[0].localeCompare(a[0]));

  const totalReclamos = planillas.reduce((t, p) => t + p._count.reclamos, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="titulo-pagina">Registros</h1>
          <p className="bajada mt-1.5">
            {planillas.length} planilla{planillas.length === 1 ? "" : "s"} ·{" "}
            {totalReclamos} reclamo{totalReclamos === 1 ? "" : "s"}
            {hayFiltros(filtros) && " (con filtros aplicados)"}
          </p>
        </div>
        <BotonExportar query={query} />
      </div>

      <BarraFiltros cuadrillas={listaCuadrillas} />

      {filtros.incidente && (
        <section className="tarjeta overflow-hidden">
          <div className="tarjeta-titulo">
            <h2 className="text-sm font-semibold">
              Reclamos con incidente “{filtros.incidente}”
            </h2>
            <span className="text-xs text-[var(--color-tinta-3)]">
              {coincidencias.length} encontrado
              {coincidencias.length === 1 ? "" : "s"}
            </span>
          </div>
          {coincidencias.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[var(--color-tinta-3)]">
              No hay ningún reclamo con ese número.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--color-borde)]">
              {coincidencias.map((r) => (
                <li key={r.id} className="transition hover:bg-slate-50/70">
                  <Link
                    href={`/revisar/${r.planilla.id}`}
                    className="block px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      <span className="tabular-nums">N.º {r.nroIncidente}</span>
                      <span className="text-[var(--color-borde-fuerte)]">·</span>
                      <span>{[r.calle, r.numero].filter(Boolean).join(" ")}</span>
                      {r.localidad && (
                        <span className="text-[var(--color-tinta-3)]">
                          ({r.localidad})
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-[var(--color-tinta-3)]">
                      {formatearFecha(r.fecha)}
                      {r.tipoReclamo && ` · ${r.tipoReclamo}`}
                      {r.movil && ` · Móvil ${r.movil}`}
                      {" · "}
                      {r.materiales.length} material
                      {r.materiales.length === 1 ? "" : "es"}
                      {" · "}
                      {ETIQUETAS[r.planilla.estado]?.texto}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {planillas.length === 0 ? (
        <div className="tarjeta px-4 py-14 text-center">
          <p className="text-sm text-[var(--color-tinta-2)]">
            {hayFiltros(filtros)
              ? "Ninguna planilla coincide con los filtros."
              : "Todavía no cargaste ninguna planilla."}
          </p>
          {!hayFiltros(filtros) && (
            <Link href="/" className="boton-primario mt-4">
              Cargar la primera
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {dias.map(([dia, delDia]) => {
            const reclamosDelDia = delDia.reduce((t, p) => t + p._count.reclamos, 0);
            return (
              <section key={dia}>
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <h2 className="text-sm font-semibold">
                    {formatearFecha(dia)}
                  </h2>
                  <span className="text-xs text-[var(--color-tinta-3)]">
                    {delDia.length} planilla{delDia.length === 1 ? "" : "s"} ·{" "}
                    {reclamosDelDia} reclamo{reclamosDelDia === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="tarjeta divide-y divide-[var(--color-borde)]">
                  {delDia.map((planilla) => {
                    const etiqueta =
                      ETIQUETAS[planilla.estado] ?? ETIQUETAS.PROCESANDO;
                    return (
                      <div
                        key={planilla.id}
                        className="flex flex-wrap items-center gap-3 px-4 py-3 transition hover:bg-slate-50/70"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-medium">
                              {planilla.archivoNombre}
                            </span>
                            <span className={`etiqueta ${etiqueta.clase}`}>
                              {etiqueta.texto}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-[var(--color-tinta-3)]">
                            {planilla._count.reclamos} reclamo
                            {planilla._count.reclamos === 1 ? "" : "s"}
                            {planilla.movil && ` · Móvil ${planilla.movil}`}
                            {planilla.oficial && ` · ${planilla.oficial}`}
                            {" · cargada el "}
                            {formatearMomento(planilla.creadoEn)}
                            {planilla.cargadaPor &&
                              ` por ${nombreCorto(planilla.cargadaPor)}`}
                            {planilla.confirmadaPor &&
                              ` · confirmada por ${nombreCorto(planilla.confirmadaPor)}`}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Link
                            href={`/revisar/${planilla.id}`}
                            className="boton-secundario min-h-0 px-3 py-2 text-xs"
                          >
                            {planilla.estado === "CONFIRMADA" ? "Ver" : "Revisar"}
                          </Link>
                          {puedeBorrar && <BorrarPlanilla id={planilla.id} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
