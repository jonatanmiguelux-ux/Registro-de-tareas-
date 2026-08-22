import { headers } from "next/headers";
import QRCode from "qrcode";
import { requerirPanol } from "@/lib/sesion";
import {
  stockPanol,
  stockPorMovil,
  ultimosMovimientos,
  ultimasEntregas,
} from "@/lib/stock";
import { MOVILES } from "@/config/municipio";
import { PanelPanol } from "@/components/PanelPanol";

export const dynamic = "force-dynamic";

/**
 * El pañol: el depósito central.
 *
 * Acá entra lo que se compra, se dan de baja roturas y faltantes, y se
 * entrega material a los móviles. Muestra también cuánto gastó cada móvil, que
 * es lo que le baja el stock. La ve la persona del pañol y los jefes.
 */
export default async function PaginaPanol() {
  await requerirPanol();

  const [stock, porMovil, movimientos, entregas] = await Promise.all([
    stockPanol(),
    stockPorMovil(),
    ultimosMovimientos(),
    ultimasEntregas(),
  ]);

  // QR y enlace para abrir esta misma pantalla desde otro dispositivo. No es un
  // acceso especial: lleva a /panol y, si no hay sesión, pide entrar con Google
  // como siempre. Se arma con el dominio real de la petición.
  const cabeceras = await headers();
  const host =
    cabeceras.get("x-forwarded-host") ?? cabeceras.get("host") ?? "";
  const protocolo =
    cabeceras.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const enlace = host ? `${protocolo}://${host}/panol` : null;
  const qr = enlace
    ? await QRCode.toDataURL(enlace, {
        margin: 1,
        width: 220,
        errorCorrectionLevel: "M",
      })
    : null;

  return (
    <PanelPanol
      moviles={MOVILES}
      enlace={enlace}
      qr={qr}
      stock={stock}
      porMovil={porMovil.map((m) => ({
        movil: m.movil,
        filas: m.filas.filter((f) => f.entregado !== 0 || f.consumido !== 0),
      }))}
      movimientos={movimientos.map((m) => ({
        id: m.id,
        material: m.material.nombre,
        unidad: m.material.unidad,
        tipo: m.tipo,
        cantidad: m.cantidad,
        fecha: m.fecha.toISOString(),
        nota: m.nota,
      }))}
      entregas={entregas.map((e) => ({
        id: e.id,
        material: e.material.nombre,
        unidad: e.material.unidad,
        movil: e.movil,
        cantidad: e.cantidad,
        fecha: e.fecha.toISOString(),
        nota: e.nota,
      }))}
    />
  );
}
