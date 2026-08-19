import Link from "next/link";
import { TIPOS_FALLA } from "@/lib/reclamos-vecinales";
import { InstalarVecino } from "@/components/InstalarVecino";

/**
 * La cara pública del servicio.
 *
 * Es lo primero que ve alguien que llega desde un folleto, un cartel o un
 * mensaje reenviado. Tiene un solo objetivo: que entienda en diez segundos
 * qué puede pedir y qué va a pasar después, y que llegue al formulario.
 *
 * Se explica el circuito completo —incluida la parte que tarda— a propósito.
 * Un canal que promete lo que no cumple es peor que no tener canal: hoy el
 * vecino no espera nada; si mañana espera y no pasa, se enoja con razón.
 */
export default function PaginaAlumbrado() {
  return (
    <div className="space-y-10">
      {/* Encabezado: fondo verde, la farola encendida y el botón principal en
          blanco para que resalte sobre el color. Es lo que da identidad. */}
      <section className="relative -mx-4 -mt-8 overflow-hidden bg-gradient-to-b from-[var(--color-acento)] to-[var(--color-acento-oscuro)] px-6 pb-12 pt-14 text-center text-white sm:mx-0 sm:mt-0 sm:rounded-3xl sm:pt-16">
        {/* Resplandor detrás de la farola. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-8 size-56 -translate-x-1/2 rounded-full bg-white/15 blur-3xl"
        />
        <FarolaEncendida />
        <h1 className="relative mt-6 text-[1.75rem] font-bold leading-tight tracking-[-0.02em] text-balance sm:text-4xl">
          ¿Hay una luz que no funciona en tu cuadra?
        </h1>
        <p className="relative mx-auto mt-3 max-w-md text-base leading-relaxed text-white/90">
          Reportala desde el celular en un minuto. Sin ir a la delegación, sin
          llamar por teléfono.
        </p>
        <Link
          href="/reclamar"
          className="relative mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-7 text-base font-semibold text-[var(--color-acento-oscuro)] shadow-lg transition hover:bg-white/90 active:scale-[0.99]"
        >
          <IconoRayo />
          Reportar una luminaria
        </Link>
      </section>

      <section>
        <h2 className="titulo-seccion">Qué podés reportar</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {TIPOS_FALLA.map((t) => (
            <div
              key={t.valor}
              className="tarjeta p-5 transition hover:border-[var(--color-acento)]"
            >
              <IconoFalla tipo={t.valor} />
              <p className="mt-3 font-semibold">{t.etiqueta}</p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--color-tinta-2)]">
                {t.ayuda}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="titulo-seccion">Cómo funciona</h2>
        {/* La línea que une los números convierte cuatro puntos sueltos en un
            recorrido: se lee como pasos de principio a fin. */}
        <ol className="relative mt-4 space-y-6 before:absolute before:left-[15px] before:top-3 before:h-[calc(100%-2rem)] before:w-0.5 before:bg-[var(--color-borde)]">
          {[
            {
              titulo: "Entrás con tu cuenta de Google",
              texto:
                "La que ya tenés. No hay que crear ninguna contraseña ni completar un registro.",
            },
            {
              titulo: "Cargás el reclamo",
              texto:
                "Elegís qué le pasa a la luminaria, decís dónde está y sacás una foto. La foto es lo que le permite a la cuadrilla encontrar el poste exacto.",
            },
            {
              titulo: "El municipio lo carga en el sistema",
              texto:
                "Se revisa y se le asigna un número de incidente oficial, el mismo que tendría si lo hubieras hecho en la delegación.",
            },
            {
              titulo: "La cuadrilla de tu zona lo recibe",
              texto:
                "Entra en el trabajo del día junto con el resto de los reclamos de la zona.",
            },
          ].map((paso, i) => (
            <li key={paso.titulo} className="relative flex gap-4">
              <span
                className="relative z-10 grid size-8 shrink-0 place-items-center rounded-full bg-[var(--color-acento)] text-sm font-bold text-white shadow-sm"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <div className="pt-0.5">
                <p className="font-semibold">{paso.titulo}</p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--color-tinta-2)]">
                  {paso.texto}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="titulo-seccion">Antes de reportar</h2>
        <div className="mt-4 space-y-2.5">
          {[
            {
              p: "¿Cuánto tarda en arreglarse?",
              r: "No podemos prometerte una fecha. Tu reclamo entra en la cola de la cuadrilla de tu zona junto con los demás, y se atiende según la carga de trabajo. Lo que sí podés hacer es ver en qué estado está, con tu número de seguimiento.",
            },
            {
              p: "¿Por qué tengo que entrar con Google?",
              r: "Para que puedas seguir tus reclamos sin anotar ningún número, y para que sepamos con quién hablar si hace falta un dato más. No pedimos ninguna contraseña nueva: usás la cuenta que ya tenés, y de ahí sólo tomamos tu nombre y tu correo.",
            },
            {
              p: "¿Y si ya lo reportó un vecino?",
              r: "No pasa nada, reportalo igual. En el municipio se juntan los repetidos; es preferible eso a que nadie avise pensando que ya avisó otro.",
            },
            {
              p: "¿Sirve para otra cosa que no sea alumbrado?",
              r: "No. Esto es sólo para luminarias de la vía pública. Para cualquier otro reclamo hay que seguir usando los canales de siempre.",
            },
          ].map((f) => (
            <details key={f.p} className="group tarjeta overflow-hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 font-semibold [&::-webkit-details-marker]:hidden">
                {f.p}
                <IconoChevron />
              </summary>
              <p className="px-4 pb-4 text-sm leading-relaxed text-[var(--color-tinta-2)]">
                {f.r}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* Ofrece instalar la app. Se muestra solo si se puede y si no está ya
          instalada; en una compu de escritorio no aparece. */}
      <InstalarVecino />

      <section className="tarjeta bg-[var(--color-acento-suave)] p-7 text-center">
        <p className="text-lg font-semibold text-balance">
          Una luz apagada tarda menos en arreglarse si alguien avisa.
        </p>
        <Link href="/reclamar" className="boton-primario mt-4 px-6 text-base">
          Reportar una luminaria
        </Link>
      </section>
    </div>
  );
}

/** La farola encendida del encabezado, con su haz de luz. */
function FarolaEncendida() {
  return (
    <svg
      viewBox="0 0 64 64"
      className="relative mx-auto h-20 w-20"
      fill="none"
      aria-hidden="true"
    >
      {/* Haz de luz que cae. */}
      <path d="M32 22 L14 52 h36 Z" fill="#fde68a" opacity="0.35" />
      {/* Rayos. */}
      <g stroke="#fde68a" strokeWidth="2.5" strokeLinecap="round" opacity="0.9">
        <line x1="32" y1="6" x2="32" y2="12" />
        <line x1="18" y1="10" x2="21" y2="15" />
        <line x1="46" y1="10" x2="43" y2="15" />
      </g>
      {/* Farol. */}
      <circle cx="32" cy="20" r="8" fill="#fef9c3" />
      <circle cx="32" cy="20" r="8" stroke="#fff" strokeWidth="1.5" opacity="0.6" />
    </svg>
  );
}

/** Ícono según el tipo de falla, coherente con lo que describe. */
function IconoFalla({ tipo }: { tipo: string }) {
  const base =
    "grid size-10 place-items-center rounded-xl bg-[var(--color-acento-suave)]";
  if (tipo === "ENCENDIDA") {
    // Sol: encendida de día.
    return (
      <span className={base} aria-hidden="true">
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="var(--color-acento)" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2M6 6l1.5 1.5M16.5 16.5 18 18M18 6l-1.5 1.5M7.5 16.5 6 18" />
        </svg>
      </span>
    );
  }
  if (tipo === "INTERMITENTE") {
    // Destello: prende y apaga.
    return (
      <span className={base} aria-hidden="true">
        <svg viewBox="0 0 24 24" className="size-6" fill="var(--color-acento)">
          <path d="M13 2 4 14h6l-1 8 9-12h-6z" />
        </svg>
      </span>
    );
  }
  // No funciona: lámpara apagada.
  return (
    <span className={base} aria-hidden="true">
      <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="var(--color-acento)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.6.6 1 1.4 1 2.5h6c0-1.1.4-1.9 1-2.5A6 6 0 0 0 12 3Z" />
      </svg>
    </span>
  );
}

function IconoRayo() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
      <path d="M13 2 4 14h6l-1 8 9-12h-6z" />
    </svg>
  );
}

function IconoChevron() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5 shrink-0 text-[var(--color-tinta-3)] transition-transform group-open:rotate-180"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
