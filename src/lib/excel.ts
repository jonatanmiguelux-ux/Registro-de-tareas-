import ExcelJS from "exceljs";
import type { Material, Prisma } from "@prisma/client";
import { formatearFecha } from "@/lib/fechas";
import type { ConsumoMaterial } from "@/lib/consultas";
import { agruparPorLocalidad, compararLocalidades } from "@/lib/localidades";

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
 * - "Por localidad": cuánto se hizo y cuánto se gastó en cada localidad.
 *
 * Las filas salen **agrupadas por localidad**, en el orden en que las nombra
 * el municipio, y dentro de cada una por fecha. Da igual cómo estuviera
 * escrita en el papel: el nombre ya viene normalizado desde la carga, así que
 * "ST", "St" y "Santa Teresita" caen en el mismo grupo.
 */
export async function construirLibro(
  reclamos: ReclamoExportado[],
  materiales: Material[],
  consumo: ConsumoMaterial[] = [],
): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  libro.creator = "Registro de tareas";
  libro.created = new Date();

  // Un solo ordenamiento para todas las hojas, así la "Reclamos" y la
  // "Materiales" se recorren en paralelo sin sorpresas.
  const ordenados = ordenarPorLocalidad(reclamos);

  const hojaReclamos = libro.addWorksheet("Reclamos", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  hojaReclamos.columns = [
    ...CAMPOS.map((c) => ({ header: c.encabezado, width: c.ancho })),
    ...materiales.map((m) => ({ header: m.nombre, width: 14 })),
  ];

  for (const reclamo of ordenados) {
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

  for (const reclamo of ordenados) {
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

  const hojaLocalidades = construirHojaLocalidades(libro, ordenados, catalogo);

  for (const hoja of [
    hojaReclamos,
    hojaMateriales,
    hojaConsumo,
    hojaLocalidades,
  ]) {
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

/**
 * Ordena los reclamos por localidad y, dentro de cada una, por fecha.
 *
 * El desempate final es el N.º de incidente y no el orden en que estaban en
 * el papel: dos planillas del mismo día en la misma localidad quedarían
 * intercaladas de forma arbitraria, y así al menos el orden es reproducible
 * —el mismo período exportado dos veces da el mismo archivo—.
 */
function ordenarPorLocalidad(
  reclamos: ReclamoExportado[],
): ReclamoExportado[] {
  return [...reclamos].sort((a, b) => {
    const porLocalidad = compararLocalidades(a.localidad, b.localidad);
    if (porLocalidad !== 0) return porLocalidad;

    const fechaA = a.fecha?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const fechaB = b.fecha?.getTime() ?? Number.MAX_SAFE_INTEGER;
    if (fechaA !== fechaB) return fechaA - fechaB;

    return (a.nroIncidente ?? "").localeCompare(b.nroIncidente ?? "", "es");
  });
}

/**
 * Hoja "Por localidad": una fila por localidad, con lo que se hizo y lo que
 * se gastó ahí.
 *
 * Es la vista que responde "¿dónde se está yendo el material?" sin tener que
 * armar una tabla dinámica. Las columnas de material son las mismas de la
 * hoja "Reclamos", así se pueden comparar de costado.
 */
function construirHojaLocalidades(
  libro: ExcelJS.Workbook,
  reclamos: ReclamoExportado[],
  catalogo: Map<string, Material>,
): ExcelJS.Worksheet {
  const hoja = libro.addWorksheet("Por localidad", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  // Sólo los materiales que realmente se usaron: una hoja con veinte columnas
  // en cero no se lee.
  const usados = [...catalogo.values()].filter((m) =>
    reclamos.some((r) => r.materiales.some((x) => x.materialId === m.id)),
  );

  hoja.columns = [
    { header: "Localidad", width: 20 },
    { header: "Reclamos", width: 11 },
    { header: "Con material", width: 13 },
    { header: "Materiales usados", width: 18 },
    { header: "Días con trabajo", width: 16 },
    ...usados.map((m) => ({ header: m.nombre, width: 14 })),
  ];

  const grupos = agruparPorLocalidad(reclamos, (r) => r.localidad);

  for (const grupo of grupos) {
    const porMaterial = new Map<string, number>();
    let conMaterial = 0;
    const dias = new Set<string>();

    for (const reclamo of grupo.filas) {
      if (reclamo.materiales.length > 0) conMaterial++;
      if (reclamo.fecha) dias.add(reclamo.fecha.toISOString().slice(0, 10));
      for (const marca of reclamo.materiales) {
        porMaterial.set(
          marca.materialId,
          (porMaterial.get(marca.materialId) ?? 0) + marca.cantidad,
        );
      }
    }

    const total = [...porMaterial.values()].reduce((t, c) => t + c, 0);

    hoja.addRow([
      grupo.localidad,
      grupo.filas.length,
      conMaterial,
      total,
      dias.size,
      ...usados.map((m) => porMaterial.get(m.id) ?? ""),
    ]);
  }

  if (grupos.length > 0) {
    const fila = hoja.addRow([
      "TOTAL",
      reclamos.length,
      reclamos.filter((r) => r.materiales.length > 0).length,
      reclamos.reduce(
        (t, r) => t + r.materiales.reduce((s, m) => s + m.cantidad, 0),
        0,
      ),
      new Set(
        reclamos
          .filter((r) => r.fecha)
          .map((r) => r.fecha!.toISOString().slice(0, 10)),
      ).size,
      ...usados.map((m) =>
        reclamos.reduce(
          (t, r) =>
            t +
            r.materiales
              .filter((x) => x.materialId === m.id)
              .reduce((s, x) => s + x.cantidad, 0),
          0,
        ),
      ),
    ]);
    fila.font = { bold: true };
  }

  return hoja;
}
