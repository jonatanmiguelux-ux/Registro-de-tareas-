import { headers } from "next/headers";
import Link from "next/link";
import QRCode from "qrcode";
import { DescargarApp } from "@/components/DescargarApp";

export const dynamic = "force-dynamic";

/**
 * El espacio para llevarse la app.
 *
 * Sirve a todos, no sólo al que entra desde el celular: en Android ofrece el
 * botón de instalar, en iPhone el instructivo, y en una computadora muestra un
 * código QR para saltar al teléfono e instalarla ahí. Antes, quien entraba
 * desde una PC no tenía ninguna forma de bajarla.
 *
 * El QR apunta al dominio real de la petición —el mismo por el que entró la
 * persona—, así funciona igual en producción y probando en la red local.
 */
export default async function PaginaDescargar() {
  const cabeceras = await headers();
  const host =
    cabeceras.get("x-forwarded-host") ?? cabeceras.get("host") ?? "";
  const protocolo =
    cabeceras.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const base = host ? `${protocolo}://${host}` : "";
  const destino = `${base}/descargar`;
  const dominioLindo = host.replace(/^www\./, "");

  const qr = base
    ? await QRCode.toDataURL(destino, {
        margin: 1,
        width: 260,
        errorCorrectionLevel: "M",
        color: { dark: "#0d1f16", light: "#ffffff" },
      })
    : null;

  return (
    <div className="space-y-10">
      {/* Encabezado a sangre completa, verde, con el teléfono y la farola. */}
      <section className="relative -mx-4 -mt-8 overflow-hidden bg-gradient-to-b from-[var(--color-acento)] to-[var(--color-acento-oscuro)] px-6 pb-12 pt-14 text-center text-white sm:mx-0 sm:mt-0 sm:rounded-3xl sm:pt-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-6 size-56 -translate-x-1/2 rounded-full bg-white/15 blur-3xl"
        />
        <TelefonoConFarola />
        <h1 className="relative mt-6 text-[1.75rem] font-bold leading-tight tracking-[-0.02em] text-balance sm:text-4xl">
          Llevá el alumbrado en tu bolsillo
        </h1>
        <p className="relative mx-auto mt-3 max-w-md text-base leading-relaxed text-white/90">
          Instalá la app en tu teléfono y reportá una luz quemada en un toque,
          sin buscar la página cada vez.
        </p>
      </section>

      {/* Dos caminos: desde el celular y desde la computadora. */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="tarjeta flex flex-col p-6">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-acento)]">
            Desde tu celular
          </span>
          <h2 className="mt-2 titulo-seccion">Instalala en un toque</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-tinta-2)]">
            Queda como una app más, con su ícono en la pantalla de inicio.
          </p>
          <div className="mt-5">
            <DescargarApp />
          </div>
        </div>

        <div className="tarjeta flex flex-col items-center p-6 text-center">
          <span className="self-start text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-acento)]">
            Desde una computadora
          </span>
          <h2 className="mt-2 self-start titulo-seccion">Pasala al teléfono</h2>
          {qr ? (
            <>
              <div className="mt-4 rounded-2xl border border-[var(--color-borde)] bg-white p-3 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qr}
                  alt={`Código QR que abre ${dominioLindo} en el teléfono`}
                  width={200}
                  height={200}
                  className="size-44"
                />
              </div>
              <p className="mt-4 text-sm leading-relaxed text-[var(--color-tinta-2)]">
                Escaneá el código con la cámara de tu celular y seguí desde ahí.
              </p>
              {dominioLindo && (
                <p className="mt-2 text-sm font-semibold text-[var(--color-acento-oscuro)]">
                  {dominioLindo}
                </p>
              )}
            </>
          ) : (
            <p className="mt-4 text-sm text-[var(--color-tinta-2)]">
              Abrí esta página desde tu teléfono para instalarla.
            </p>
          )}
        </div>
      </section>

      {/* Por qué tenerla instalada. */}
      <section>
        <h2 className="titulo-seccion">Por qué conviene tenerla</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            {
              titulo: "Un toque y listo",
              texto:
                "Se abre directo en el reporte, sin buscar la página ni escribir la dirección.",
              icono: <IconoRayo />,
            },
            {
              titulo: "No ocupa casi nada",
              texto:
                "No pesa como las apps de la tienda: es la misma página, guardada como app.",
              icono: <IconoPluma />,
            },
            {
              titulo: "Sin tiendas ni cuentas nuevas",
              texto:
                "No hace falta Play Store ni App Store. Entrás con tu cuenta de Google y ya.",
              icono: <IconoEscudo />,
            },
          ].map((b) => (
            <div key={b.titulo} className="tarjeta p-5">
              <span className="grid size-10 place-items-center rounded-xl bg-[var(--color-acento-suave)] text-[var(--color-acento)]">
                {b.icono}
              </span>
              <p className="mt-3 font-semibold">{b.titulo}</p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--color-tinta-2)]">
                {b.texto}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Cierre: por si ya la tiene o prefiere reportar directo. */}
      <section className="tarjeta bg-[var(--color-acento-suave)] p-7 text-center">
        <p className="text-lg font-semibold text-balance">
          ¿No querés instalar nada? También podés reportar desde acá.
        </p>
        <Link href="/reclamar" className="boton-primario mt-4 px-6 text-base">
          Reportar una luminaria
        </Link>
      </section>
    </div>
  );
}

/** El teléfono con la farola encendida en la pantalla: la idea de la app. */
function TelefonoConFarola() {
  return (
    <div className="relative mx-auto grid size-24 place-items-center" aria-hidden="true">
      <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
        {/* Teléfono */}
        <rect x="28" y="14" width="40" height="68" rx="9" fill="#fff" fillOpacity="0.14" stroke="#fff" strokeWidth="2.4" />
        <rect x="43" y="20" width="10" height="2.6" rx="1.3" fill="#fff" fillOpacity="0.7" />
        {/* Farola en la pantalla */}
        <g stroke="#fff" strokeWidth="2.2" strokeLinecap="round" opacity="0.92">
          <line x1="48" y1="34" x2="48" y2="39" />
          <line x1="39" y1="37" x2="42" y2="40" />
          <line x1="57" y1="37" x2="54" y2="40" />
        </g>
        <circle cx="48" cy="50" r="10" fill="#fff" />
        <rect x="43" y="61" width="10" height="3.4" rx="1.7" fill="#fff" />
        <rect x="45" y="66" width="6" height="3" rx="1.5" fill="#fff" />
      </svg>
    </div>
  );
}

function IconoRayo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
    </svg>
  );
}

function IconoPluma() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 5c-9 0-14 5-14 12 0 0 3-1 6-1M20 5c0 8-6 11-11 12M20 5l-9 9" />
    </svg>
  );
}

function IconoEscudo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
