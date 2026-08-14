"use client";

/**
 * Descarga el .xlsx de lo que está filtrado en pantalla.
 *
 * Usa la misma query string que la vista, así lo que baja es exactamente lo
 * que la persona está viendo. Sin filtros, exporta todo el histórico.
 */
export function BotonExportar({
  query,
  etiqueta = "Exportar a Excel",
}: {
  query: string;
  etiqueta?: string;
}) {
  return (
    <button
      type="button"
      className="boton-primario"
      onClick={() => {
        window.location.href = `/api/export${query ? `?${query}` : ""}`;
      }}
    >
      {etiqueta}
    </button>
  );
}
