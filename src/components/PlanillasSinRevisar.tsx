"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatearFecha, formatearMomento } from "@/lib/fechas";

type Fila = {
  id: string;
  estado: string;
  archivoNombre: string;
  fecha: string | null;
  movil: string | null;
  creadoEn: string;
  _count: { reclamos: number };
};

/**
 * Las últimas planillas que quedaron a medio revisar, para poder retomarlas
 * sin ir a buscarlas al historial.
 *
 * Pide los datos desde el navegador a propósito, en vez de renderizarse en el
 * servidor: la pantalla de cargar tiene que seguir siendo estática para que el
 * service worker pueda guardarla y abrirla **sin señal**, que es cuando hay
 * que poder sacar la foto igual. Si se renderizara en el servidor, la copia
 * guardada mostraría una lista congelada del día que se instaló la app.
 *
 * Sin conexión simplemente no aparece, que es lo honesto.
 */
export function PlanillasSinRevisar() {
  const [filas, setFilas] = useState<Fila[]>([]);

  useEffect(() => {
    let vigente = true;

    fetch("/api/planillas")
      .then((r) => (r.ok ? r.json() : []))
      .then((datos: Fila[]) => {
        if (!vigente || !Array.isArray(datos)) return;
        setFilas(
          datos
            .filter((p) => p.estado === "EN_REVISION" || p.estado === "PROCESANDO")
            .slice(0, 3),
        );
      })
      .catch(() => {});

    return () => {
      vigente = false;
    };
  }, []);

  if (filas.length === 0) return null;

  return (
    <section className="tarjeta overflow-hidden">
      <div className="tarjeta-titulo">
        <h2 className="text-sm font-semibold">Sin terminar de revisar</h2>
        <Link
          href="/registros"
          className="text-xs font-semibold text-[var(--color-acento)] hover:underline"
        >
          Ver todo
        </Link>
      </div>
      <ul className="divide-y divide-[var(--color-borde)]">
        {filas.map((p) => (
          <li key={p.id}>
            <Link
              href={`/revisar/${p.id}`}
              className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50/70"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {p.fecha
                    ? `Planilla del ${formatearFecha(p.fecha)}`
                    : p.archivoNombre}
                </span>
                <span className="mt-0.5 block text-xs text-[var(--color-tinta-3)]">
                  {p._count.reclamos} reclamo
                  {p._count.reclamos === 1 ? "" : "s"}
                  {p.movil && ` · Móvil ${p.movil}`} · cargada el{" "}
                  {formatearMomento(p.creadoEn)}
                </span>
              </span>
              <span className="etiqueta shrink-0 bg-[var(--color-alerta-fondo)] text-[var(--color-alerta)]">
                {p.estado === "PROCESANDO" ? "Procesando" : "En revisión"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
