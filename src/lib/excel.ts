import ExcelJS from "exceljs";
import type { Material, Prisma } from "@prisma/client";
import { formatearFecha } from "@/lib/fechas";
import type { ConsumoMaterial } from "@/lib/consultas";

type ReclamoExportado = Prisma.ReclamoGetPayload<{
  include: { materiales: true; planilla: true };
}>;

/** Mismo orden que la planilla de papel: cabecera, columnas, y control. */
const CAMPOS = [
  { encabezado: "Fecha", ancho: 12 },
  { encabezado: "Oficial", ancho: 20 },
  { encabezado: "Chofer", ancho: 20 },
  { encabezado: "Móvil N.º", ancho: 10 },
  { encabezado: "Localidad", ancho: 18 },
  { encabezado: "Tipo de reclamo", ancho: 24 },
  { encabezado: "Fecha Ingreso", ancho: 14 },
  { encabezado: "N.º Incidente", ancho: 16 },
  { encabezado: "Calle", ancho: 26 },
  { encabezado: "N.º", ancho: 10 },
  { encabezado: "Diagnóstico", ancho: 18 },
  { encabezado: "Observaciones", ancho: 32 },
  { encabezado: "Revisado", ancho: 10 },
  { encabezado: "Confianza IA", ancho: 12 },
  { encabezado: "Planilla", ancho: 26 },
] as const;

/**
 * Arma el libro de Excel con tres hojas:
 *
 * - "Reclamos": una fila por reclamo, con una columna por material. Es la
 *   vista que se parece al papel y sirve para leer de un vistazo.
 * - "Materiales": una fila por cada material usado en cada reclamo. Es la
 *   vista larga, la que sirve para tablas dinámicas.
 * - "Consumo": el total por tipo de material del período exportado, ya sumado.
 */
export async function construirLibro(
  reclamos: ReclamoExportado[],
  materiales: Material[],
  consumo: ConsumoMaterial[] = [],
): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  libro.creator = "Registro de tareas";
  libro.created = new Date();

  const hojaReclamos = libro.addWorksheet("Reclamos", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  hojaReclamos.columns = [
    ...CAMPOS.map((c) => ({ header: c.encabezado, width: c.ancho })),
    ...materiales.map((m) => ({ header: m.nombre, width: 14 })),
  ];

  for (const reclamo of reclamos) {
    const porMaterial = new Map(
      reclamo.materiales.map((m) => [m.materialId, m.cantidad]),
    );

    hojaReclamos.addRow([
      formatearFecha(reclamo.fecha),
      reclamo.oficial ?? "",
      reclamo.chofer ?? "",
      reclamo.movil ?? "",
      reclamo.localidad ?? "",
      reclamo.tipoReclamo ?? "",
      formatearFecha(reclamo.fechaIngreso),
      reclamo.nroIncidente ?? "",
      reclamo.calle ?? "",
      reclamo.numero ?? "",
      reclamo.diagnostico ?? "",
      reclamo.observaciones ?? "",
      reclamo.revisado ? "Sí" : "No",
      reclamo.confianza ?? "",
      reclamo.planilla.archivoNombre,
      ...materiales.map((m) => porMaterial.get(m.id) ?? ""),
    ]);
  }

  const hojaMateriales = libro.addWorksheet("Materiales", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  hojaMateriales.columns = [
    { header: "Fecha", width: 12 },
    { header: "N.º Incidente", width: 16 },
    { header: "Localidad", width: 18 },
    { header: "Calle", width: 26 },
    { header: "N.º", width: 10 },
    { header: "Grupo", width: 18 },
    { header: "Material", width: 18 },
    { header: "Cantidad", width: 10 },
    { header: "Unidad", width: 10 },
    { header: "Oficial", width: 20 },
    { header: "Móvil N.º", width: 10 },
  ];

  const catalogo = new Map(materiales.map((m) => [m.id, m]));

  for (const reclamo of reclamos) {
    for (const marca of reclamo.materiales) {
      const material = catalogo.get(marca.materialId);
      if (!material) continue;
      hojaMateriales.addRow([
        formatearFecha(reclamo.fecha),
        reclamo.nroIncidente ?? "",
        reclamo.localidad ?? "",
        reclamo.calle ?? "",
        reclamo.numero ?? "",
        material.grupo ?? "",
        material.nombre,
        marca.cantidad,
        material.unidad ?? "",
        reclamo.oficial ?? "",
        reclamo.movil ?? "",
      ]);
    }
  }

  const hojaConsumo = libro.addWorksheet("Consumo", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  hojaConsumo.columns = [
    { header: "Grupo", width: 18 },
    { header: "Material", width: 22 },
    { header: "Cantidad", width: 12 },
    { header: "Unidad", width: 10 },
    { header: "Reclamos", width: 12 },
  ];

  for (const linea of consumo) {
    hojaConsumo.addRow([
      linea.grupo ?? "",
      linea.nombre,
      linea.cantidad,
      linea.unidad ?? "",
      linea.reclamos,
    ]);
  }

  if (consumo.length > 0) {
    const total = hojaConsumo.addRow([
      "",
      "TOTAL",
      consumo.reduce((t, c) => t + c.cantidad, 0),
      "",
      "",
    ]);
    total.font = { bold: true };
  }

  for (const hoja of [hojaReclamos, hojaMateriales, hojaConsumo]) {
    hoja.getRow(1).font = { bold: true };
    hoja.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE8EDF5" },
    };
    hoja.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: hoja.columnCount },
    };
  }

  const datos = await libro.xlsx.writeBuffer();
  return Buffer.from(datos);
}
