import "server-only";

/**
 * Envío de correos, con Resend.
 *
 * Se usa la API por HTTP directo, sin librería: es un solo POST y así no se
 * suma otra dependencia.
 *
 * **Todo apagado si no está configurado.** Si no hay clave o remitente, no
 * manda nada y devuelve false, sin romper. Un correo que no sale nunca puede
 * frenar lo que lo disparó: avisarle al vecino es un extra, no el trabajo.
 */

const API = "https://api.resend.com/emails";

export async function enviarEmail(opts: {
  para: string;
  asunto: string;
  html: string;
  texto: string;
}): Promise<boolean> {
  const clave = process.env.RESEND_API_KEY?.trim();
  const desde = process.env.EMAIL_DESDE?.trim();
  if (!clave || !desde) return false;

  try {
    const r = await fetch(API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clave}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: desde,
        to: [opts.para],
        subject: opts.asunto,
        html: opts.html,
        text: opts.texto,
      }),
    });
    return r.ok;
  } catch {
    // Sin conexión al servicio, un error del proveedor, lo que sea: se traga.
    return false;
  }
}
