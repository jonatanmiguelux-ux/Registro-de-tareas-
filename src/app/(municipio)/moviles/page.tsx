import { requerirRol } from "@/lib/sesion";
import { stockPorMovil, type FilaMovil } from "@/lib/stock";

export const dynamic = "force-dynamic";

/**
 * Stock por móvil.
 *
 * Lo que cada camión tiene disponible: lo que el pañol le entregó menos lo que
 * gastó en sus planillas confirmadas. Es de sólo lectura —quien mueve el stock
 * es el pañol—, y la ven jefes y encargados.
 */
export default async function PaginaMoviles() {
  await requerirRol("ENCARGADO");
  const moviles = await stockPorMovil();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="titulo-pagina">Stock por móvil</h1>
        <p className="mt-1 text-sm text-[var(--color-tinta-2)]">
          Lo que cada móvil tiene disponible: lo que el pañol le entregó, menos
          lo que gastó en sus planillas confirmadas. El material lo mueve el
          pañol; acá se mira.
        </p>
      </div>

      {moviles.map(({ movil, filas }) => (
        <SeccionMovil key={movil} movil={movil} filas={filas} />
      ))}
    </div>
  );
}

function SeccionMovil({ movil, filas }: { movil: number; filas: FilaMovil[] }) {
  // Sólo importan los materiales con algo de movimiento; el catálogo entero
  // lleno de ceros no dice nada.
  const conMovimiento = filas.filter(
    (f) => f.entregado !== 0 || f.consumido !== 0,
  );
  const sinStock = conMovimiento.filter((f) => f.disponible <= 0);

  return (
    <section className="tarjeta overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-borde)] px-4 py-3">
        <h2 className="text-base font-semibold">Móvil {movil}</h2>
        {sinStock.length > 0 && (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900">
            {sinStock.length} sin stock
          </span>
        )}
      </div>

      {conMovimiento.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-[var(--color-tinta-3)]">
          Todavía no se le entregó material a este móvil.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-borde)] text-left text-xs uppercase tracking-wide text-[var(--color-tinta-3)]">
                <th className="px-4 py-2 font-medium">Material</th>
                <th className="px-4 py-2 text-right font-medium">Entregado</th>
                <th className="px-4 py-2 text-right font-medium">Consumido</th>
                <th className="px-4 py-2 text-right font-medium">Disponible</th>
              </tr>
            </thead>
            <tbody>
              {conMovimiento.map((f) => (
                <tr
                  key={f.materialId}
                  className="border-b border-[var(--color-borde)] last:border-0"
                >
                  <td className="px-4 py-2 font-medium">{f.nombre}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-[var(--color-tinta-2)]">
                    {redondear(f.entregado)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-[var(--color-tinta-2)]">
                    {redondear(f.consumido)}
                  </td>
                  <td
                    className={`px-4 py-2 text-right font-semibold tabular-nums ${
                      f.disponible <= 0
                        ? "text-[var(--color-mal)]"
                        : "text-[var(--color-tinta)]"
                    }`}
                  >
                    {redondear(f.disponible)}
                    {f.unidad ? ` ${f.unidad}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/** Los conteos son enteros casi siempre; se muestran sin decimales de más. */
function redondear(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
