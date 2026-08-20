import { NextResponse } from "next/server";
import { rolDeApi } from "@/lib/sesion";

export const runtime = "nodejs";

/**
 * GET /api/probar-correo — diagnóstico del envío de correos. Sólo administrador.
 *
 * Manda un correo de prueba a la propia casilla de quien lo abre y devuelve la
 * respuesta CRUDA de Resend, para poder ver el error exacto si algo falla
 * (dominio sin verificar, remitente mal escrito, clave inválida). Nunca revela
 * la clave: sólo si está presente y cómo empieza.
 */
export async function GET() {
  const sesion = await rolDeApi("ADMINISTRADOR");
  if (!sesion.ok) return sesion.respuesta;

  const clave = process.env.RESEND_API_KEY?.trim();
  const desde = process.env.EMAIL_DESDE?.trim();
  const para = sesion.usuario.email;

  const config = {
    clavePresente: Boolean(clave),
    claveEmpieza: clave ? clave.slice(0, 3) + "…" : null,
    emailDesde: desde ?? null,
    tuCorreo: para,
  };

  if (!clave || !desde) {
    return NextResponse.json({
      config,
      envio: "no se intentó: falta RESEND_API_KEY o EMAIL_DESDE en Render",
    });
  }
  if (!para) {
    return NextResponse.json({
      config,
      envio: "no se intentó: tu cuenta no tiene correo",
    });
  }

  let status = 0;
  let cuerpo: unknown = null;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clave}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: desde,
        to: [para],
        subject: "Prueba de correo · Alumbrado",
        text: "Si recibiste esto, el envío de correos funciona.",
      }),
    });
    status = r.status;
    cuerpo = await r.json().catch(() => null);
  } catch (e) {
    cuerpo = { errorDeRed: e instanceof Error ? e.message : String(e) };
  }

  return NextResponse.json({
    config,
    envio: { status, respuestaResend: cuerpo },
  });
}
