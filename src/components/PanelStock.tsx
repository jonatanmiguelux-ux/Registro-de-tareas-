"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatearFecha } from "@/lib/fechas";
import type { FilaStock } from "@/lib/stock";

type MovimientoVista = {
  id: string;
  material: string;
  unidad: string | null;
  tipo: "ENTRADA" | "SALIDA";
  cantidad: number;
  fecha: string;
  nota: string | null;
};

export function PanelStock({
  stock,
  movimientos,
  puedeFijarInicial = false,
}: {
  stock: FilaStock[];
  movimientos: MovimientoVista[];
  /** Sólo los administradores corrigen el punto de partida del stock. */
  puedeFijarInicial?: boolean;
}) {
  const router = useRouter();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);

  // Formulario de movimiento.
  const [materialId, setMaterialId] = useState(stock[0]?.materialId ?? "");
  const [tipo, setTipo] = useState<"ENTRADA" | "SALIDA">("ENTRADA");
  const [cantidad, setCantidad] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [nota, setNota] = useState("");

  async function llamar(metodo: string, cuerpo: unknown) {
    setGuardando(true);
    setError(null);
    try {
      const respuesta = await fetch("/api/stock", {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => ({}));
        setError(datos.error ?? "No se pudo guardar.");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("Falló la conexión. Volvé a intentar.");
      return false;
    } finally {
      setGuardando(false);
    }
  }

  async function registrarMovimiento(e: React.FormEvent) {
    e.preventDefault();
    const numero = Number(cantidad);
    if (!materialId || !Number.isFinite(numero) || numero <= 0) {
      setError("Elegí un material y una cantidad mayor a cero.");
      return;
    }
    const ok = await llamar("POST", {
      materialId,
      tipo,
      cantidad: numero,
      fecha,
      nota: nota || null,
    });
    if (ok) {
      setCantidad("");
      setNota("");
    }
  }

  const bajos = stock.filter((s) => s.stockActual <= 0 && tuvoMovimiento(s));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="titulo-pagina">Stock</h1>
        <p className="mt-1 text-sm text-[var(--color-tinta-2)]">
          El consumo se descuenta solo desde las planillas confirmadas. Cargá
          acá únicamente lo que no pasa por una planilla: compras que entran al
          depósito, roturas, traspasos.
        </p>
      </div>

      {bajos.length > 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong className="font-medium">Sin stock:</strong>{" "}
          {bajos.map((b) => b.nombre).join(", ")}. Revisá si falta cargar una
          entrada de depósito.
        </p>
      )}

      <form onSubmit={registrarMovimiento} className="tarjeta p-4">
        <h2 className="text-sm font-semibold text-[var(--color-tinta)]">
          Registrar movimiento
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
          <label className="block lg:col-span-2">
            <span className="mb-1 block text-xs font-medium text-[var(--color-tinta-2)]">
              Material
            </span>
            <select
              className="campo"
              value={materialId}
              onChange={(e) => setMaterialId(e.target.value)}
            >
              {stock.map((s) => (
                <option key={s.materialId} value={s.materialId}>
                  {s.nombre}
                  {s.grupo ? ` — ${s.grupo}` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-[var(--color-tinta-2)]">
              Tipo
            </span>
            <select
              className="campo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as "ENTRADA" | "SALIDA")}
            >
              <option value="ENTRADA">Entrada</option>
              <option value="SALIDA">Salida</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-[var(--color-tinta-2)]">
              Cantidad
            </span>
            <input
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              className="campo"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-[var(--color-tinta-2)]">
              Fecha
            </span>
            <input
              type="date"
              className="campo"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </label>

          <label className="block sm:col-span-2 lg:col-span-4">
            <span className="mb-1 block text-xs font-medium text-[var(--color-tinta-2)]">
              Nota (opcional)
            </span>
            <input
              type="text"
              className="campo"
              placeholder="Ej.: compra remito 1234, rotura en obrador"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />
          </label>

          <button type="submit" className="boton-primario" disabled={guardando}>
            {guardando ? "Guardando…" : "Registrar"}
          </button>
        </div>
        {error && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}
      </form>

      <section className="tarjeta overflow-hidden">
        <h2 className="border-b border-[var(--color-borde)] px-4 py-3 text-sm font-semibold">
          Stock por material
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-sm">
            <thead>
              <tr className="border-b border-[var(--color-borde)] text-left text-xs font-medium text-[var(--color-tinta-2)]">
                <th className="px-4 py-2">Material</th>
                <th className="px-4 py-2 text-right">Inicial</th>
                <th className="px-4 py-2 text-right">Entradas</th>
                <th className="px-4 py-2 text-right">Salidas</th>
                <th className="px-4 py-2 text-right">Consumo</th>
                <th className="px-4 py-2 text-right">Actual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-borde)]">
              {stock.map((s) => (
                <tr key={s.materialId}>
                  <td className="px-4 py-2">
                    <span className="font-medium">{s.nombre}</span>
                    {s.grupo && (
                      <span className="ml-2 text-xs text-[var(--color-tinta-3)]">{s.grupo}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {editando === s.materialId ? (
                      <EditarInicial
                        valor={s.stockInicial}
                        onCancelar={() => setEditando(null)}
                        onGuardar={async (valor) => {
                          const ok = await llamar("PATCH", {
                            materialId: s.materialId,
                            stockInicial: valor,
                          });
                          if (ok) setEditando(null);
                        }}
                      />
                    ) : puedeFijarInicial ? (
                      <button
                        type="button"
                        className="tabular-nums underline decoration-dotted underline-offset-2 hover:text-[var(--color-acento)]"
                        onClick={() => setEditando(s.materialId)}
                        title="Fijar el stock inicial"
                      >
                        {s.stockInicial}
                      </button>
                    ) : (
                      <span className="tabular-nums">{s.stockInicial}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-green-700">
                    {s.entradas > 0 ? `+${s.entradas}` : "—"}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-[var(--color-tinta-2)]">
                    {s.salidas > 0 ? `−${s.salidas}` : "—"}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-[var(--color-tinta-2)]">
                    {s.consumo > 0 ? `−${s.consumo}` : "—"}
                  </td>
                  <td
                    className={`px-4 py-2 text-right font-semibold tabular-nums ${
                      s.stockActual < 0
                        ? "text-red-700"
                        : s.stockActual === 0
                          ? "text-amber-700"
                          : ""
                    }`}
                  >
                    {s.stockActual}
                    {s.unidad && (
                      <span className="ml-1 text-xs font-normal text-[var(--color-tinta-3)]">
                        {s.unidad}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-[var(--color-borde)] px-4 py-2 text-xs text-[var(--color-tinta-3)]">
          Actual = inicial + entradas − salidas − consumo.
          {puedeFijarInicial
            ? " Tocá el número de “Inicial” para corregirlo."
            : " El stock inicial lo corrige un administrador."}
        </p>
      </section>

      <section className="tarjeta overflow-hidden">
        <h2 className="border-b border-[var(--color-borde)] px-4 py-3 text-sm font-semibold">
          Últimos movimientos
        </h2>
        {movimientos.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-[var(--color-tinta-2)]">
            Todavía no cargaste movimientos de depósito.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--color-borde)]">
            {movimientos.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm"
              >
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    m.tipo === "ENTRADA"
                      ? "bg-green-100 text-green-800"
                      : "bg-slate-100 text-[var(--color-tinta)]"
                  }`}
                >
                  {m.tipo === "ENTRADA" ? "Entrada" : "Salida"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{m.material}</span>
                  <span className="ml-2 tabular-nums">
                    {m.tipo === "ENTRADA" ? "+" : "−"}
                    {m.cantidad}
                    {m.unidad && ` ${m.unidad}`}
                  </span>
                  <span className="ml-2 text-xs text-[var(--color-tinta-3)]">
                    {formatearFecha(m.fecha)}
                    {m.nota && ` · ${m.nota}`}
                  </span>
                </span>
                <button
                  type="button"
                  className="shrink-0 text-xs text-[var(--color-tinta-3)] hover:text-red-700"
                  disabled={guardando}
                  onClick={() => llamar("DELETE", { id: m.id })}
                >
                  Deshacer
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function tuvoMovimiento(s: FilaStock): boolean {
  return s.stockInicial > 0 || s.entradas > 0 || s.salidas > 0 || s.consumo > 0;
}

function EditarInicial({
  valor,
  onGuardar,
  onCancelar,
}: {
  valor: number;
  onGuardar: (valor: number) => void;
  onCancelar: () => void;
}) {
  const [texto, setTexto] = useState(String(valor));
  return (
    <span className="flex items-center justify-end gap-1">
      <input
        type="number"
        min="0"
        step="any"
        autoFocus
        className="w-20 rounded border border-[var(--color-borde)] px-1 py-1 text-right text-sm"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const n = Number(texto);
            if (Number.isFinite(n) && n >= 0) onGuardar(n);
          }
          if (e.key === "Escape") onCancelar();
        }}
      />
      <button
        type="button"
        className="text-xs text-[var(--color-acento)]"
        onClick={() => {
          const n = Number(texto);
          if (Number.isFinite(n) && n >= 0) onGuardar(n);
        }}
      >
        OK
      </button>
      <button type="button" className="text-xs text-[var(--color-tinta-3)]" onClick={onCancelar}>
        ✕
      </button>
    </span>
  );
}
