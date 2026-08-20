import "server-only";
import { enviarEmail } from "@/lib/email";
import { NOMBRE_MUNICIPIO } from "@/config/municipio";

/**
 * El aviso al vecino de que su reclamo ya está en el sistema del municipio.
 *
 * Se dispara cuando la cuadrilla —o el municipio— le anota el N.º de incidente,
 * que es el momento en que el reclamo deja de ser un aviso suelto y pasa a ser
 * un pedido oficial con seguimiento.
 *
 * Es "el mejor esfuerzo": si el correo no sale, no pasa nada grave. El reclamo
 * ya está cargado igual; el mail es una cortesía, no parte del trámite.
 */

export type ReclamoParaAvisar = {
  contacto: string | null;
  codigo: string;
  calle: string;
  numero: string;
  localidad: string;
  nroIncidente: string | null;
};

export async function avisarReclamoRealizado(
  reclamo: ReclamoParaAvisar,
): Promise<void> {
  if (!reclamo.contacto) return;

  const direccion = `${reclamo.calle} ${reclamo.numero}, ${reclamo.localidad}`;
  const incidente = reclamo.nroIncidente
    ? `N.º de incidente: ${reclamo.nroIncidente}.`
    : "";

  const asunto = "Su pedido fue realizado";

  const texto = [
    "Su pedido fue realizado.",
    "",
    `Tu reclamo por la luminaria en ${direccion} fue cargado en el sistema del municipio.`,
    incidente,
    "",
    `Código de seguimiento: ${reclamo.codigo}.`,
    "",
    `Gracias por avisar. — ${NOMBRE_MUNICIPIO}, Alumbrado Público.`,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
<div style="font-family:Segoe UI,Arial,sans-serif;max-width:520px;margin:0 auto;color:#17202e;line-height:1.55">
  <div style="background:#0b8452;color:#fff;padding:20px 24px;border-radius:12px 12px 0 0">
    <div style="font-size:13px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.85">Alumbrado público</div>
    <div style="font-size:22px;font-weight:700;margin-top:4px">Su pedido fue realizado</div>
  </div>
  <div style="border:1px solid #e1e6ec;border-top:none;border-radius:0 0 12px 12px;padding:24px">
    <p style="margin:0 0 14px">
      Tu reclamo por la luminaria en <strong>${direccion}</strong> fue cargado
      en el sistema del municipio.
    </p>
    ${
      reclamo.nroIncidente
        ? `<p style="margin:0 0 14px">
             <span style="display:inline-block;background:#e6f6ee;color:#0b8452;font-weight:600;padding:6px 12px;border-radius:8px">
               N.º de incidente ${reclamo.nroIncidente}
             </span>
           </p>`
        : ""
    }
    <p style="margin:0 0 14px;color:#48566a;font-size:14px">
      Código de seguimiento: <strong>${reclamo.codigo}</strong>.
    </p>
    <p style="margin:18px 0 0;color:#7a8698;font-size:13px">
      Gracias por avisar.<br>${NOMBRE_MUNICIPIO} · Alumbrado Público
    </p>
  </div>
</div>`.trim();

  await enviarEmail({ para: reclamo.contacto, asunto, html, texto });
}
