import { NextResponse } from "next/server";
import { rolDeApi } from "@/lib/sesion";
import { avisarReclamoRealizado } from "@/lib/notificaciones-vecino";

export const runtime = "nodejs";

/**
 * GET /api/probar-correo — se manda a sí mismo el correo de aviso de prueba.
 * Sólo administrador.
 *
 * Sirve para ver cómo queda el correo "Su pedido fue realizado" —el mismo que
 * recibe el vecino— sin tener que derivar un reclamo de verdad. Útil para
 * confirmar que el envío funciona y para revisar el diseño.
 */
export async function GET() {
  const sesion = await rolDeApi("ADMINISTRADOR");
  if (!sesion.ok) return sesion.respuesta;

  const clave = process.env.RESEND_API_KEY?.trim();
  const desde = process.env.EMAIL_DESDE?.trim();
  const para = sesion.usuario.email;

  if (!clave || !desde) {
    return NextResponse.json({
      ok: false,
      motivo: "Falta RESEND_API_KEY o EMAIL_DESDE en la configuración.",
    });
  }
  if (!para) {
    return NextResponse.json({ ok: false, motivo: "Tu cuenta no tiene correo." });
  }

  // Manda el correo real, con datos de ejemplo, a la propia casilla.
  await avisarReclamoRealizado({
    contacto: para,
    codigo: "PRUEBA-01",
    calle: "Av. Costanera",
    numero: "1200",
    localidad: "Mar de Ajó",
    nroIncidente: "12345",
  });

  return NextResponse.json({
    ok: true,
    enviadoA: para,
    nota: "Revisá tu correo (y la carpeta de spam la primera vez).",
  });
}
