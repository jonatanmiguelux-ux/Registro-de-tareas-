import { prisma } from "@/lib/prisma";
import { requerirRol } from "@/lib/sesion";
import { listarCuadrillas } from "@/lib/cuadrillas-db";
import { describirZona, localidadesSinAsignar } from "@/lib/cuadrillas";
import { LOCALIDADES } from "@/lib/localidades";
import { RepartoCuadrillas } from "@/components/RepartoCuadrillas";

export const dynamic = "force-dynamic";

/**
 * El reparto de zonas. Del encargado para arriba.
 *
 * Cambiar quién cubre qué es una decisión de gestión, no técnica: tiene que
 * poder hacerse desde acá y no editando el código.
 */
export default async function PaginaCuadrillas() {
  await requerirRol("ENCARGADO");

  const cuadrillas = await listarCuadrillas();
  const sinAsignar = localidadesSinAsignar(cuadrillas);

  // Cuántos reclamos de vecinos tiene cada una esperando, para que quien
  // reparte vea el efecto de lo que está por mover.
  const pendientes = await prisma.reclamoVecinal.groupBy({
    by: ["cuadrilla"],
    where: { estado: "RECIBIDO" },
    _count: { _all: true },
  });
  const porCuadrilla = new Map(
    pendientes.map((p) => [p.cuadrilla, p._count._all]),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="titulo-pagina">Cuadrillas y zonas</h1>
        <p className="bajada mt-1.5">
          Qué localidades cubre cada cuadrilla. Los reclamos que cargan los
          vecinos se derivan solos según este reparto.
        </p>
      </div>

      {sinAsignar.length > 0 && (
        <div className="rounded-[var(--radius-tarjeta)] border border-[var(--color-alerta-borde)] bg-[var(--color-alerta-fondo)] px-4 py-3 text-sm">
          <p className="font-semibold text-[var(--color-alerta)]">
            {sinAsignar.length} localidad
            {sinAsignar.length === 1 ? "" : "es"} sin cuadrilla
          </p>
          <p className="mt-0.5 text-[var(--color-tinta-2)]">
            Los reclamos de {sinAsignar.join(", ")} no le van a llegar a ningún
            equipo: quedan aparte en la bandeja de Vecinos hasta que alguien los
            mire.
          </p>
        </div>
      )}

      <RepartoCuadrillas
        cuadrillas={cuadrillas.map((c) => ({
          numero: c.numero,
          localidades: c.localidades,
          zona: describirZona(c.localidades),
          pendientes: porCuadrilla.get(c.numero) ?? 0,
        }))}
        localidades={LOCALIDADES.map((l) => l.nombre)}
      />

      <p className="text-xs leading-relaxed text-[var(--color-tinta-3)]">
        El número de cuadrilla es el mismo que el Móvil N.º de la planilla de
        papel: es lo que permite cruzar un reclamo de vecino con el trabajo que
        después aparece cargado. Cambiar el reparto no toca los reclamos ya
        derivados — sólo afecta a los que entren de ahora en más.
      </p>
    </div>
  );
}
