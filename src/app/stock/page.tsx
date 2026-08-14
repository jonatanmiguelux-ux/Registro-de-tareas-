import { calcularStock, ultimosMovimientos } from "@/lib/stock";
import { PanelStock } from "@/components/PanelStock";

export const dynamic = "force-dynamic";

export default async function PaginaStock() {
  const [stock, movimientos] = await Promise.all([
    calcularStock(),
    ultimosMovimientos(),
  ]);

  return (
    <PanelStock
      stock={stock}
      movimientos={movimientos.map((m) => ({
        id: m.id,
        material: m.material.nombre,
        unidad: m.material.unidad,
        tipo: m.tipo,
        cantidad: m.cantidad,
        fecha: m.fecha.toISOString(),
        nota: m.nota,
      }))}
    />
  );
}
