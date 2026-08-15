import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardarImagen } from "@/lib/almacenamiento";
import { analizarPlanilla, esTipoImagenValido, mensajeDeError } from "@/lib/ocr";
import { asegurarMateriales, clave, listarMateriales } from "@/lib/materiales";
import { parsearFecha } from "@/lib/fechas";
import { normalizarLocalidad } from "@/lib/localidades";
import { normalizarDiagnostico } from "@/lib/diagnosticos";
import { usuarioDeApi } from "@/lib/sesion";

export const runtime = "nodejs";
export const maxDuration = 300;

const TAMANIO_MAXIMO = 20 * 1024 * 1024;

/** GET /api/planillas — histórico, de la más reciente a la más vieja. */
export async function GET() {
  const sesion = await usuarioDeApi();
  if (!sesion.ok) return sesion.respuesta;

  const planillas = await prisma.planilla.findMany({
    orderBy: { creadoEn: "desc" },
    include: { _count: { select: { reclamos: true } } },
  });
  return NextResponse.json(planillas);
}

/** POST /api/planillas — recibe la foto, la analiza y guarda el borrador. */
export async function POST(request: Request) {
  const sesion = await usuarioDeApi();
  if (!sesion.ok) return sesion.respuesta;

  const formulario = await request.formData();
  const archivo = formulario.get("imagen");

  if (!(archivo instanceof File)) {
    return NextResponse.json(
      { error: "Falta la imagen de la planilla." },
      { status: 400 },
    );
  }

  if (!esTipoImagenValido(archivo.type)) {
    return NextResponse.json(
      {
        error: `Formato no soportado (${archivo.type || "desconocido"}). Usá JPG, PNG, WEBP o HEIC.`,
      },
      { status: 415 },
    );
  }

  if (archivo.size > TAMANIO_MAXIMO) {
    return NextResponse.json(
      { error: "La imagen supera los 20 MB. Sacá la foto con menos resolución." },
      { status: 413 },
    );
  }

  const bytes = Buffer.from(await archivo.arrayBuffer());
  const archivoRuta = await guardarImagen(bytes, archivo.type);

  const planilla = await prisma.planilla.create({
    data: {
      estado: "PROCESANDO",
      archivoNombre: archivo.name || "planilla",
      archivoTipo: archivo.type,
      archivoRuta,
    },
  });

  try {
    const catalogo = await listarMateriales();
    const { datos, modelo } = await analizarPlanilla(
      bytes.toString("base64"),
      archivo.type,
      catalogo
        .filter((m) => m.columnaImpresa)
        .map((m) => ({ nombre: m.nombre, grupo: m.grupo })),
      catalogo
        .filter((m) => !m.columnaImpresa)
        .map((m) => ({ nombre: m.nombre })),
    );

    const mapaMateriales = await asegurarMateriales(datos.columnasMateriales);

    // Una planilla larga son decenas de inserts; el tope de 5 s que trae
    // Prisma por defecto se queda corto en una base lenta.
    await prisma.$transaction(async (tx) => {
      await tx.planilla.update({
        where: { id: planilla.id },
        data: {
          estado: "EN_REVISION",
          fecha: parsearFecha(datos.encabezado.fecha),
          oficial: datos.encabezado.oficial,
          chofer: datos.encabezado.chofer,
          movil: datos.encabezado.movil,
          localidad: normalizarLocalidad(datos.encabezado.localidad),
          modelo,
          respuestaCruda: datos,
          notasIa: datos.notas,
        },
      });

      for (const [indice, fila] of datos.reclamos.entries()) {
        // Los datos de cabecera bajan a cada fila cuando la fila no los trae.
        // Así el reclamo queda completo y se puede exportar solo.
        const reclamo = await tx.reclamo.create({
          data: {
            planillaId: planilla.id,
            orden: indice,
            fecha: parsearFecha(fila.fecha ?? datos.encabezado.fecha),
            oficial: fila.oficial ?? datos.encabezado.oficial,
            chofer: fila.chofer ?? datos.encabezado.chofer,
            movil: fila.movil ?? datos.encabezado.movil,
            localidad: normalizarLocalidad(
              fila.localidad ?? datos.encabezado.localidad,
            ),
            tipoReclamo: fila.tipoReclamo,
            fechaIngreso: parsearFecha(fila.fechaIngreso),
            nroIncidente: fila.nroIncidente,
            calle: fila.calle,
            numero: fila.numero,
            diagnostico: normalizarDiagnostico(fila.diagnostico),
            observaciones: fila.observaciones,
            confianza: fila.confianza,
          },
        });

        const marcas = new Map<string, number>();
        for (const marca of fila.materiales) {
          const material = mapaMateriales.get(clave(marca.nombre));
          if (!material) continue;
          // Si la IA repite una columna en la misma fila, nos quedamos con el
          // mayor: una X duplicada no debe borrar una cantidad escrita.
          const anterior = marcas.get(material.id) ?? 0;
          marcas.set(material.id, Math.max(anterior, marca.cantidad ?? 1));
        }

        if (marcas.size > 0) {
          await tx.reclamoMaterial.createMany({
            data: [...marcas].map(([materialId, cantidad]) => ({
              reclamoId: reclamo.id,
              materialId,
              cantidad,
            })),
          });
        }
      }
    }, { timeout: 60_000, maxWait: 10_000 });

    return NextResponse.json({ id: planilla.id }, { status: 201 });
  } catch (error) {
    // En pantalla va el mensaje traducido; en la base queda el original, que
    // es el que sirve para diagnosticar después.
    const mensaje = mensajeDeError(error);
    const crudo =
      error instanceof Error ? error.message : "Error desconocido al analizar.";

    await prisma.planilla.update({
      where: { id: planilla.id },
      data: { estado: "ERROR", error: crudo },
    });
    return NextResponse.json(
      { id: planilla.id, error: mensaje },
      { status: 502 },
    );
  }
}
