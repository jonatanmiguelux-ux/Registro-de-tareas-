import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { listarMateriales } from "@/lib/materiales";
import { detectarDuplicados } from "@/lib/duplicados";
import { RevisarPlanilla } from "@/components/RevisarPlanilla";

export const dynamic = "force-dynamic";

export default async function PaginaRevisar({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
        <h1 className="text-2xl font-semibold tracking-tight">
          No se pudo leer la planilla
        </h1>
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {planilla.error ?? "Error desconocido."}
        </p>
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
