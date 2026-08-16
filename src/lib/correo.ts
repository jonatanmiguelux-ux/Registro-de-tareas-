import nodemailer from "nodemailer";

/**
 * Envío de correo, para verificar el contacto de quien carga un reclamo.
 *
 * La configuración va por variables de entorno y no está atada a ningún
 * proveedor: se puede arrancar con una cuenta de Gmail y mudarse después sin
 * tocar código.
 *
 * **Si no hay nada configurado, el código se escribe en la consola del
 * servidor** en vez de enviarse. Es deliberado: permite probar todo el
 * circuito en una PC sin dar de alta una cuenta de correo. En producción, sin
 * configuración, esto dejaría reclamos sin poder verificar, así que la app
 * avisa al arrancar.
 */

function hayConfiguracion(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
}

let transporte: nodemailer.Transporter | null = null;

function obtenerTransporte(): nodemailer.Transporter {
  if (transporte) return transporte;
  transporte = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    // 465 usa TLS desde el principio; 587 lo negocia después (STARTTLS).
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporte;
}

export type ResultadoEnvio =
  | { ok: true }
  | { ok: false; motivo: string };

/**
 * Manda el código de verificación de un reclamo.
 *
 * Nunca lanza: que falle el correo no puede tumbar la carga del reclamo, que
 * ya quedó guardado. Devuelve el motivo para poder mostrarlo.
 */
export async function enviarCodigo(
  destino: string,
  codigo: string,
  seguimiento: string,
): Promise<ResultadoEnvio> {
  if (!hayConfiguracion()) {
    // Modo desarrollo: sin cuenta de correo, el código va a la consola.
    console.log(
      `\n  [correo no configurado] Código para ${destino}: ${codigo}\n` +
        `  (reclamo ${seguimiento})\n`,
    );
    return { ok: true };
  }

  const remitente =
    process.env.SMTP_DESDE ?? `Alumbrado público <${process.env.SMTP_USER}>`;

  try {
    await obtenerTransporte().sendMail({
      from: remitente,
      to: destino,
      subject: `Tu código para confirmar el reclamo: ${codigo}`,
      text: [
        "Recibimos tu reclamo de alumbrado público.",
        "",
        `Tu código de confirmación es: ${codigo}`,
        "",
        "Ingresalo en la página para que el reclamo entre al sistema.",
        `El código vence en 30 minutos.`,
        "",
        `Número de seguimiento: ${seguimiento}`,
        "",
        "Si no cargaste ningún reclamo, ignorá este mensaje.",
      ].join("\n"),
    });
    return { ok: true };
  } catch (error) {
    console.error("Falló el envío del correo:", error);
    return {
      ok: false,
      motivo:
        "No pudimos enviarte el correo. Revisá que la dirección esté bien escrita.",
    };
  }
}

/** Para avisar en la pantalla interna si falta configurar el correo. */
export function correoConfigurado(): boolean {
  return hayConfiguracion();
}
