"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatearFecha } from "@/lib/fechas";
import type { FilaPanol, FilaMovil } from "@/lib/stock";

type MovimientoVista = {
  id: string;
  material: string;
  unidad: string | null;
  tipo: "ENTRADA" | "SALIDA";
  cantidad: number;
  fecha: string;
  nota: string | null;
};

type EntregaVista = {
  id: string;
  material: string;
  unidad: string | null;
  movil: number;
  /** Firmada: positiva la entrega, negativa la devolución. */
  cantidad: number;
  fecha: string;
  nota: string | null;
};

type GastoMovil = { movil: number; filas: FilaMovil[] };

export function PanelPanol({
  moviles,
  stock,
  porMovil,
  movimientos,
  entregas,
}: {
  moviles: number[];
  stock: FilaPanol[];
  porMovil: GastoMovil[];
  movimientos: MovimientoVista[];
  entregas: EntregaVista[];
}) {
  const router = useRouter();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Formulario de entrega a un móvil.
  const [eMovil, setEMovil] = useState(moviles[0] ?? 0);
  const [eMaterial, setEMaterial] = useState(stock[0]?.materialId ?? "");
  const [eTipo, setETipo] = useState<"ENTREGA" | "DEVOLUCION">("ENTREGA");
  const [eCantidad, setECantidad] = useState("");

  // Formulario de compra / baja del pañol.
  const [mMaterial, setMMaterial] = useState(stock[0]?.materialId ?? "");
  const [mTipo, setMTipo] = useState<"ENTRADA" | "SALIDA">("ENTRADA");
  const [mCantidad, setMCantidad] = useState("");
  const [mNota, setMNota] = useState("");

  async function llamar(url: string, metodo: string, cuerpo: unknown) {
    setGuardando(true);
    setError(null);
    try {
      const respuesta = await fetch(url, {
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

  async function entregar(e: React.FormEvent) {
    e.preventDefault();
    const numero = Number(eCantidad);
    if (!eMaterial || !Number.isFinite(numero) || numero <= 0) {
      setError("Elegí un material y una cantidad mayor a cero.");
      return;
    }
    const ok = await llamar("/api/entregas", "POST", {
      movil: eMovil,
      materialId: eMaterial,
      cantidad: numero,
      tipo: eTipo,
    });
    if (ok) setECantidad("");
  }

  async function registrarMovimiento(e: React.FormEvent) {
    e.preventDefault();
    const numero = Number(mCantidad);
    if (!mMaterial || !Number.isFinite(numero) || numero <= 0) {
      setError("Elegí un material y una cantidad mayor a cero.");
      return;
    }
    const ok = await llamar("/api/stock", "POST", {
      materialId: mMaterial,
      tipo: mTipo,
      cantidad: numero,
      nota: mNota || null,
    });
    if (ok) {
      setMCantidad("");
      setMNota("");
    }
  }

  const enPanolDe = (materialId: string) =>
    stock.find((s) => s.materialId === materialId)?.enPanol ?? 0;

  const conStock = stock.filter(
    (s) =>
      s.stockInicial !== 0 ||
      s.entradas !== 0 ||
      s.salidas !== 0 ||
      s.entregado !== 0,
  );
  const bajos = conStock.filter((s) => s.enPanol <= 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="titulo-pagina">Pañol</h1>
        <p className="mt-1 text-sm text-[var(--color-tinta-2)]">
          El depósito central. Entrá acá las compras, las bajas por rotura o
          faltante, y entregá material a los móviles. Lo que se entrega se
          descuenta del pañol y se le suma al móvil.
        </p>
      </div>

      {bajos.length > 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong className="font-medium">Sin stock en el pañol:</strong>{" "}
          {bajos.map((b) => b.nombre).join(", ")}.
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-red-200 bg-[var(--color-mal-fondo)] px-4 py-3 text-sm text-[var(--color-mal)]">
          {error}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Entregar a un móvil */}
        <form onSubmit={entregar} className="tarjeta p-4">
          <h2 className="font-semibold">Entregar a un móvil</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs text-[var(--color-tinta-2)]">Móvil</span>
              <select
                className="campo mt-1"
                value={eMovil}
                onChange={(ev) => setEMovil(Number(ev.target.value))}
              >
                {moviles.map((m) => (
                  <option key={m} value={m}>
                    Móvil {m}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-[var(--color-tinta-2)]">
                Movimiento
              </span>
              <select
                className="campo mt-1"
                value={eTipo}
                onChange={(ev) =>
                  setETipo(ev.target.value as "ENTREGA" | "DEVOLUCION")
                }
              >
                <option value="ENTREGA">Entregar al móvil</option>
                <option value="DEVOLUCION">Devolver al pañol</option>
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs text-[var(--color-tinta-2)]">
                Material
              </span>
              <select
                className="campo mt-1"
                value={eMaterial}
                onChange={(ev) => setEMaterial(ev.target.value)}
              >
                {stock.map((s) => (
                  <option key={s.materialId} value={s.materialId}>
                    {s.nombre} — {redondear(enPanolDe(s.materialId))} en pañol
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-[var(--color-tinta-2)]">
                Cantidad
              </span>
              <input
                className="campo mt-1"
                type="number"
                min="0"
                step="1"
                value={eCantidad}
                onChange={(ev) => setECantidad(ev.target.value)}
                placeholder="0"
              />
            </label>
          </div>
          <button
            type="submit"
            className="boton-primario mt-4 w-full"
            disabled={guardando}
          >
            {eTipo === "ENTREGA" ? "Entregar" : "Devolver"}
          </button>
        </form>

        {/* Compra / baja del pañol */}
        <form onSubmit={registrarMovimiento} className="tarjeta p-4">
          <h2 className="font-semibold">Registrar compra o baja</h2>
          <p className="mt-1 text-xs text-[var(--color-tinta-3)]">
            Compra: material que entra al pañol. Baja: rotura o faltante.
          </p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-xs text-[var(--color-tinta-2)]">
                Material
              </span>
              <select
                className="campo mt-1"
                value={mMaterial}
                onChange={(ev) => setMMaterial(ev.target.value)}
              >
                {stock.map((s) => (
                  <option key={s.materialId} value={s.materialId}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-[var(--color-tinta-2)]">Tipo</span>
              <select
                className="campo mt-1"
                value={mTipo}
                onChange={(ev) =>
                  setMTipo(ev.target.value as "ENTRADA" | "SALIDA")
                }
              >
                <option value="ENTRADA">Compra (entra)</option>
                <option value="SALIDA">Baja (sale)</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-[var(--color-tinta-2)]">
                Cantidad
              </span>
              <input
                className="campo mt-1"
                type="number"
                min="0"
                step="1"
                value={mCantidad}
                onChange={(ev) => setMCantidad(ev.target.value)}
                placeholder="0"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs text-[var(--color-tinta-2)]">
                Nota (opcional)
              </span>
              <input
                className="campo mt-1"
                type="text"
                value={mNota}
                onChange={(ev) => setMNota(ev.target.value)}
                placeholder="Remito, proveedor, motivo…"
              />
            </label>
          </div>
          <button
            type="submit"
            className="boton-secundario mt-4 w-full"
            disabled={guardando}
          >
            Registrar
          </button>
        </form>
      </div>

      {/* Stock del pañol */}
      <section className="tarjeta overflow-hidden p-0">
        <div className="border-b border-[var(--color-borde)] px-4 py-3">
          <h2 className="text-base font-semibold">Stock en el pañol</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-borde)] text-left text-xs uppercase tracking-wide text-[var(--color-tinta-3)]">
                <th className="px-4 py-2 font-medium">Material</th>
                <th className="px-4 py-2 text-right font-medium">Inicial</th>
                <th className="px-4 py-2 text-right font-medium">Compras</th>
                <th className="px-4 py-2 text-right font-medium">Bajas</th>
                <th className="px-4 py-2 text-right font-medium">Entregado</th>
                <th className="px-4 py-2 text-right font-medium">En pañol</th>
              </tr>
            </thead>
            <tbody>
              {conStock.map((s) => (
                <tr
                  key={s.materialId}
                  className="border-b border-[var(--color-borde)] last:border-0"
                >
                  <td className="px-4 py-2 font-medium">{s.nombre}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-[var(--color-tinta-3)]">
                    {redondear(s.stockInicial)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-[var(--color-tinta-2)]">
                    {redondear(s.entradas)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-[var(--color-tinta-2)]">
                    {redondear(s.salidas)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-[var(--color-tinta-2)]">
                    {redondear(s.entregado)}
                  </td>
                  <td
                    className={`px-4 py-2 text-right font-semibold tabular-nums ${
                      s.enPanol <= 0
                        ? "text-[var(--color-mal)]"
                        : "text-[var(--color-tinta)]"
                    }`}
                  >
                    {redondear(s.enPanol)}
                    {s.unidad ? ` ${s.unidad}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Gasto por móvil */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Gasto de cada móvil</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {porMovil.map(({ movil, filas }) => (
            <div key={movil} className="tarjeta p-4">
              <h3 className="font-semibold">Móvil {movil}</h3>
              {filas.length === 0 ? (
                <p className="mt-2 text-sm text-[var(--color-tinta-3)]">
                  Sin movimientos todavía.
                </p>
              ) : (
                <ul className="mt-2 space-y-1 text-sm">
                  {filas.map((f) => (
                    <li
                      key={f.materialId}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="text-[var(--color-tinta-2)]">
                        {f.nombre}
                      </span>
                      <span className="tabular-nums">
                        <span className="text-[var(--color-tinta-3)]">
                          {redondear(f.consumido)} gastado
                        </span>{" "}
                        ·{" "}
                        <span
                          className={
                            f.disponible <= 0
                              ? "font-semibold text-[var(--color-mal)]"
                              : "font-semibold"
                          }
                        >
                          {redondear(f.disponible)} queda
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Últimas entregas */}
      {entregas.length > 0 && (
        <section className="tarjeta p-4">
          <h2 className="font-semibold">Últimas entregas</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {entregas.map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-center gap-x-2 gap-y-1"
              >
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                    e.cantidad >= 0
                      ? "bg-[var(--color-acento-suave)] text-[var(--color-acento)]"
                      : "bg-slate-100 text-[var(--color-tinta-2)]"
                  }`}
                >
                  {e.cantidad >= 0 ? "Entrega" : "Devolución"}
                </span>
                <span>
                  <strong className="font-medium">
                    {redondear(Math.abs(e.cantidad))}
                  </strong>{" "}
                  {e.material} · Móvil {e.movil}
                </span>
                <span className="text-[var(--color-tinta-3)]">
                  {formatearFecha(e.fecha)}
                </span>
                <button
                  type="button"
                  className="ml-auto text-xs text-[var(--color-tinta-3)] underline underline-offset-2 hover:text-[var(--color-mal)]"
                  disabled={guardando}
                  onClick={() => llamar("/api/entregas", "DELETE", { id: e.id })}
                >
                  Deshacer
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Últimos movimientos del pañol */}
      {movimientos.length > 0 && (
        <section className="tarjeta p-4">
          <h2 className="font-semibold">Últimas compras y bajas</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {movimientos.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center gap-x-2 gap-y-1"
              >
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                    m.tipo === "ENTRADA"
                      ? "bg-[var(--color-acento-suave)] text-[var(--color-acento)]"
                      : "bg-slate-100 text-[var(--color-tinta-2)]"
                  }`}
                >
                  {m.tipo === "ENTRADA" ? "Compra" : "Baja"}
                </span>
                <span>
                  <strong className="font-medium">
                    {redondear(m.cantidad)}
                  </strong>{" "}
                  {m.material}
                </span>
                {m.nota && (
                  <span className="text-[var(--color-tinta-3)]">— {m.nota}</span>
                )}
                <span className="text-[var(--color-tinta-3)]">
                  {formatearFecha(m.fecha)}
                </span>
                <button
                  type="button"
                  className="ml-auto text-xs text-[var(--color-tinta-3)] underline underline-offset-2 hover:text-[var(--color-mal)]"
                  disabled={guardando}
                  onClick={() => llamar("/api/stock", "DELETE", { id: m.id })}
                >
                  Deshacer
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function redondear(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
