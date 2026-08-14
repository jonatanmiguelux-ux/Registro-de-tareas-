"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { paraInputDate } from "@/lib/fechas";

export type MaterialVista = {
  id: string;
  nombre: string;
  grupo: string | null;
  unidad: string | null;
};

/** Agrupa respetando el orden del catálogo, que es el orden del papel. */
function agrupar(materiales: MaterialVista[]): [string, MaterialVista[]][] {
  const grupos = new Map<string, MaterialVista[]>();
  for (const material of materiales) {
    const grupo = material.grupo ?? "Otros materiales";
    const actual = grupos.get(grupo);
    if (actual) actual.push(material);
    else grupos.set(grupo, [material]);
  }
  return [...grupos];
}

export type ReclamoVista = {
  id: string;
  fecha: string | null;
  oficial: string | null;
  chofer: string | null;
  movil: string | null;
  localidad: string | null;
  tipoReclamo: string | null;
  fechaIngreso: string | null;
  nroIncidente: string | null;
  calle: string | null;
  numero: string | null;
  observaciones: string | null;
  confianza: string | null;
  revisado: boolean;
  materiales: { materialId: string; cantidad: number }[];
};

export type PlanillaVista = {
  id: string;
  estado: string;
  archivoNombre: string;
  notasIa: string | null;
  reclamos: ReclamoVista[];
};

/**
 * Campos de texto de un reclamo.
 *
 * Los primeros seis son las columnas de la planilla, en el orden del papel
 * (con "Dirección" abierta en calle y altura). Los últimos cuatro no son
 * columnas: se heredan de la cabecera y quedan editables por si una fila fue
 * la excepción.
 */
const CAMPOS = [
  { clave: "localidad", etiqueta: "Localidad", tipo: "text" },
  { clave: "tipoReclamo", etiqueta: "Tipo de reclamo", tipo: "text" },
  { clave: "fechaIngreso", etiqueta: "Fecha Ingreso", tipo: "date" },
  { clave: "nroIncidente", etiqueta: "N.º Incidente", tipo: "text" },
  { clave: "calle", etiqueta: "Calle", tipo: "text" },
  { clave: "numero", etiqueta: "N.º", tipo: "text" },
  { clave: "fecha", etiqueta: "Fecha", tipo: "date" },
  { clave: "oficial", etiqueta: "Oficial", tipo: "text" },
  { clave: "chofer", etiqueta: "Chofer", tipo: "text" },
  { clave: "movil", etiqueta: "Móvil", tipo: "text" },
] as const;

type ClaveCampo = (typeof CAMPOS)[number]["clave"];

export function RevisarPlanilla({
  planilla,
  materiales,
}: {
  planilla: PlanillaVista;
  materiales: MaterialVista[];
}) {
  const router = useRouter();
  const [reclamos, setReclamos] = useState<ReclamoVista[]>(planilla.reclamos);
  const [verFoto, setVerFoto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dudosos = useMemo(
    () => reclamos.filter((r) => r.confianza === "baja" && !r.revisado).length,
    [reclamos],
  );

  function editarCampo(id: string, campo: ClaveCampo, valor: string) {
    setReclamos((previos) =>
      previos.map((r) =>
        r.id === id ? { ...r, [campo]: valor === "" ? null : valor } : r,
      ),
    );
  }

  function editarObservaciones(id: string, valor: string) {
    setReclamos((previos) =>
      previos.map((r) =>
        r.id === id ? { ...r, observaciones: valor === "" ? null : valor } : r,
      ),
    );
  }

  function alternarMaterial(id: string, materialId: string) {
    setReclamos((previos) =>
      previos.map((r) => {
        if (r.id !== id) return r;
        const existe = r.materiales.some((m) => m.materialId === materialId);
        return {
          ...r,
          materiales: existe
            ? r.materiales.filter((m) => m.materialId !== materialId)
            : [...r.materiales, { materialId, cantidad: 1 }],
        };
      }),
    );
  }

  function editarCantidad(id: string, materialId: string, valor: string) {
    const cantidad = Number(valor);
    if (!Number.isFinite(cantidad) || cantidad <= 0) return;
    setReclamos((previos) =>
      previos.map((r) =>
        r.id === id
          ? {
              ...r,
              materiales: r.materiales.map((m) =>
                m.materialId === materialId ? { ...m, cantidad } : m,
              ),
            }
          : r,
      ),
    );
  }

  async function guardar(confirmar: boolean) {
    setGuardando(true);
    setError(null);
    setMensaje(null);

    try {
      const respuesta = await fetch(`/api/planillas/${planilla.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmar,
          reclamos: reclamos.map((r) => ({
            id: r.id,
            fecha: r.fecha ? paraInputDate(r.fecha) : null,
            oficial: r.oficial,
            chofer: r.chofer,
            movil: r.movil,
            localidad: r.localidad,
            tipoReclamo: r.tipoReclamo,
            fechaIngreso: r.fechaIngreso ? paraInputDate(r.fechaIngreso) : null,
            nroIncidente: r.nroIncidente,
            calle: r.calle,
            numero: r.numero,
            observaciones: r.observaciones,
            materiales: r.materiales,
          })),
        }),
      });

      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => ({}));
        setError(datos.error ?? "No se pudieron guardar los cambios.");
        return;
      }

      if (confirmar) {
        router.push("/registros");
        return;
      }

      setMensaje("Cambios guardados.");
      router.refresh();
    } catch {
      setError("Falló la conexión al guardar. Volvé a intentar.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Revisar y corregir
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {reclamos.length} reclamo{reclamos.length === 1 ? "" : "s"} leído
            {reclamos.length === 1 ? "" : "s"} de {planilla.archivoNombre}
            {dudosos > 0 && (
              <>
                {" · "}
                <span className="font-medium text-amber-700">
                  {dudosos} para mirar con atención
                </span>
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          className="boton-secundario"
          onClick={() => setVerFoto((v) => !v)}
        >
          {verFoto ? "Ocultar foto" : "Ver la foto"}
        </button>
      </div>

      {planilla.notasIa && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong className="font-medium">Aviso de la lectura:</strong>{" "}
          {planilla.notasIa}
        </p>
      )}

      {verFoto && (
        <div className="tarjeta overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/planillas/${planilla.id}/imagen`}
            alt="Planilla original"
            className="max-h-[70vh] w-full bg-slate-100 object-contain"
          />
        </div>
      )}

      {reclamos.length === 0 && (
        <p className="tarjeta px-4 py-6 text-center text-sm text-slate-600">
          No se detectó ninguna fila con datos. Revisá la foto y volvé a
          cargarla.
        </p>
      )}

      <div className="space-y-4">
        {reclamos.map((reclamo, indice) => (
          <FilaReclamo
            key={reclamo.id}
            indice={indice}
            reclamo={reclamo}
            materiales={materiales}
            onCampo={editarCampo}
            onObservaciones={editarObservaciones}
            onMaterial={alternarMaterial}
            onCantidad={editarCantidad}
          />
        ))}
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}
      {mensaje && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {mensaje}
        </p>
      )}

      <div className="sticky bottom-0 -mx-4 border-t border-[var(--color-borde)] bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="boton-secundario"
            onClick={() => guardar(false)}
            disabled={guardando}
          >
            Guardar borrador
          </button>
          <button
            type="button"
            className="boton-primario"
            onClick={() => guardar(true)}
            disabled={guardando || reclamos.length === 0}
          >
            {guardando ? "Guardando…" : "Confirmar planilla"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FilaReclamo({
  indice,
  reclamo,
  materiales,
  onCampo,
  onObservaciones,
  onMaterial,
  onCantidad,
}: {
  indice: number;
  reclamo: ReclamoVista;
  materiales: MaterialVista[];
  onCampo: (id: string, campo: ClaveCampo, valor: string) => void;
  onObservaciones: (id: string, valor: string) => void;
  onMaterial: (id: string, materialId: string) => void;
  onCantidad: (id: string, materialId: string, valor: string) => void;
}) {
  const marcados = new Map(
    reclamo.materiales.map((m) => [m.materialId, m.cantidad]),
  );
  const dudoso = reclamo.confianza === "baja" && !reclamo.revisado;

  return (
    <section
      className={`tarjeta p-4 ${dudoso ? "border-amber-300 bg-amber-50/40" : ""}`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-700">
          Reclamo {indice + 1}
        </h2>
        {dudoso && (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
            Lectura dudosa
          </span>
        )}
        {reclamo.revisado && (
          <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800">
            Revisado
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {CAMPOS.map((campo) => (
          <label key={campo.clave} className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              {campo.etiqueta}
            </span>
            <input
              className="campo"
              type={campo.tipo}
              value={
                campo.tipo === "date"
                  ? paraInputDate(reclamo[campo.clave] as string | null)
                  : ((reclamo[campo.clave] as string | null) ?? "")
              }
              onChange={(e) => onCampo(reclamo.id, campo.clave, e.target.value)}
            />
          </label>
        ))}
      </div>

      <label className="mt-3 block">
        <span className="mb-1 block text-xs font-medium text-slate-600">
          Observaciones
        </span>
        <textarea
          className="campo min-h-16 resize-y"
          value={reclamo.observaciones ?? ""}
          onChange={(e) => onObservaciones(reclamo.id, e.target.value)}
        />
      </label>

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium text-slate-600">Materiales</p>
        {materiales.length === 0 ? (
          <p className="text-sm text-slate-500">
            Todavía no hay columnas de materiales en el catálogo.
          </p>
        ) : (
          <div className="space-y-3">
            {agrupar(materiales).map(([grupo, delGrupo]) => (
              <fieldset key={grupo}>
                <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {grupo}
                </legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {delGrupo.map((material) => {
                    const activo = marcados.has(material.id);
                    return (
                      <div
                        key={material.id}
                        className={`flex items-center gap-2 rounded-md border px-2 py-2 text-sm ${
                          activo
                            ? "border-[var(--color-acento)] bg-blue-50"
                            : "border-[var(--color-borde)] bg-white"
                        }`}
                      >
                        <input
                          id={`${reclamo.id}-${material.id}`}
                          type="checkbox"
                          className="size-4 shrink-0 accent-[var(--color-acento)]"
                          checked={activo}
                          onChange={() => onMaterial(reclamo.id, material.id)}
                        />
                        <label
                          htmlFor={`${reclamo.id}-${material.id}`}
                          className="min-w-0 flex-1 truncate"
                          title={material.nombre}
                        >
                          {material.nombre}
                        </label>
                        {activo && (
                          <input
                            type="number"
                            min="0"
                            step="any"
                            aria-label={`Cantidad de ${material.nombre}`}
                            className="w-14 shrink-0 rounded border border-[var(--color-borde)] px-1 py-1 text-right text-sm"
                            value={marcados.get(material.id) ?? 1}
                            onChange={(e) =>
                              onCantidad(reclamo.id, material.id, e.target.value)
                            }
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
