import { calcularStock, ultimosMovimientos } from "@/lib/stock";
import { PanelStock } from "@/components/PanelStock";
import { requerirUsuario } from "@/lib/sesion";

export const dynamic = "force-dynamic";

export default async function PaginaStock() {
  const usuario = await requerirUsuario();

  const [stock, movimientos] = await Promise.all([
    calcularStock(),
    ultimosMovimientos(),
  ]);

  return (
    <PanelStock
      // El stock inicial es el punto de partida de toda la cuenta: si alguien
      // lo cambia por error, todos los números quedan corridos y no hay
      // rastro de cuál era el anterior. Sólo administradores.
      puedeFijarInicial={usuario.rol === "ADMINISTRADOR"}
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
