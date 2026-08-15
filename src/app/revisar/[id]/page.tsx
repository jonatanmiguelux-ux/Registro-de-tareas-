import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { listarMateriales } from "@/lib/materiales";
import { detectarDuplicados } from "@/lib/duplicados";
import { RevisarPlanilla } from "@/components/RevisarPlanilla";
import { requerirUsuario } from "@/lib/sesion";

export const dynamic = "force-dynamic";

export default async function PaginaRevisar({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await requerirUsuario();
  const { id } = await params;

  const [planilla, materiales, duplicados] = await Promise.all([
    prisma.planilla.findUnique({
      where: { id },
      include: {
        reclamos: { orderBy: { orden: "asc" }, include: { materiales: true } },
      },
    }),
    listarMateriales(),
    detectarDuplicados(id),
  ]);

  if (!planilla) notFound();

  if (planilla.estado === "ERROR") {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="titulo-pagina">No se pudo leer la planilla</h1>
        <p className="rounded-lg border border-red-200 bg-[var(--color-mal-fondo)] px-4 py-3 text-sm text-[var(--color-mal)]">
          {planilla.error ?? "No se pudo leer la planilla. Probá de nuevo."}
        </p>

        {/* El detalle crudo del proveedor viene en inglés y menciona claves,
            cuotas y URLs internas. Sirve para diagnosticar, así que se
            muestra sólo a quien administra, y plegado. */}
        {usuario.rol === "ADMINISTRADOR" && planilla.errorTecnico && (
          <details className="tarjeta overflow-hidden">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
              Detalle técnico
            </summary>
            <pre className="overflow-x-auto border-t border-[var(--color-borde)] bg-[var(--color-fondo)] px-4 py-3 text-xs whitespace-pre-wrap">
              {planilla.errorTecnico}
            </pre>
          </details>
        )}

        <Link href="/" className="boton-primario">
          Probar con otra foto
        </Link>
      </div>
    );
  }

  return (
    <RevisarPlanilla
      planilla={{
        id: planilla.id,
        estado: planilla.estado,
        archivoNombre: planilla.archivoNombre,
        notasIa: planilla.notasIa,
        reclamos: planilla.reclamos.map((r) => ({
          id: r.id,
          fecha: r.fecha?.toISOString() ?? null,
          oficial: r.oficial,
          chofer: r.chofer,
          movil: r.movil,
          localidad: r.localidad,
          tipoReclamo: r.tipoReclamo,
          fechaIngreso: r.fechaIngreso?.toISOString() ?? null,
          nroIncidente: r.nroIncidente,
          calle: r.calle,
          numero: r.numero,
          diagnostico: r.diagnostico,
          observaciones: r.observaciones,
          confianza: r.confianza,
          revisado: r.revisado,
          materiales: r.materiales.map((m) => ({
            materialId: m.materialId,
            cantidad: m.cantidad,
          })),
        })),
      }}
      materiales={materiales.map((m) => ({
        id: m.id,
        nombre: m.nombre,
        grupo: m.grupo,
        unidad: m.unidad,
      }))}
      duplicadosIniciales={duplicados}
    />
  );
}
