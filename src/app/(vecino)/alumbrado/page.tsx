import Link from "next/link";
import { TIPOS_FALLA } from "@/lib/reclamos-vecinales";

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
    <div className="space-y-12">
      <section className="text-center">
        <h1 className="text-3xl font-semibold leading-tight tracking-[-0.02em] sm:text-4xl">
          ¿Hay una luz que no funciona en tu cuadra?
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-base leading-relaxed text-[var(--color-tinta-2)]">
          Reportala desde el celular en un minuto. No hace falta que vayas a la
          delegación, ni que crees una cuenta, ni que llames por teléfono.
        </p>
        <Link href="/reclamar" className="boton-primario mt-6 px-6 text-base">
          Reportar una luminaria
        </Link>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Qué podés reportar</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {TIPOS_FALLA.map((t) => (
            <div key={t.valor} className="tarjeta p-4">
              <p className="text-sm font-semibold">{t.etiqueta}</p>
              <p className="mt-1 text-sm text-[var(--color-tinta-2)]">
                {t.ayuda}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Cómo funciona</h2>
        <ol className="mt-3 space-y-3">
          {[
            {
              titulo: "Cargás el reclamo",
              texto:
                "Elegís qué le pasa a la luminaria, decís dónde está y sacás una foto. La foto es lo que le permite a la cuadrilla encontrar el poste exacto.",
            },
            {
              titulo: "Te damos un número de seguimiento",
              texto:
                "Guardalo. Con ese número podés volver cuando quieras y ver en qué estado quedó, sin cuenta ni contraseña.",
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
            <li key={paso.titulo} className="flex gap-4">
              <span
                className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--color-acento-suave)] text-sm font-bold text-[var(--color-acento)]"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <span>
                <span className="block font-semibold">{paso.titulo}</span>
                <span className="block text-sm leading-relaxed text-[var(--color-tinta-2)]">
                  {paso.texto}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Antes de reportar</h2>
        <dl className="mt-3 divide-y divide-[var(--color-borde)]">
          {[
            {
              p: "¿Cuánto tarda en arreglarse?",
              r: "No podemos prometerte una fecha. Tu reclamo entra en la cola de la cuadrilla de tu zona junto con los demás, y se atiende según la carga de trabajo. Lo que sí podés hacer es ver en qué estado está, con tu número de seguimiento.",
            },
            {
              p: "¿Tengo que dejar mis datos?",
              r: "No. El correo es opcional, y sirve sólo para que podamos avisarte cómo sigue. Sin correo el reclamo entra igual.",
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
            <div key={f.p} className="py-3">
              <dt className="text-sm font-semibold">{f.p}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-[var(--color-tinta-2)]">
                {f.r}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="tarjeta bg-[var(--color-acento-suave)] p-6 text-center">
        <p className="text-base font-semibold">
          Una luz apagada tarda menos en arreglarse si alguien avisa.
        </p>
        <Link href="/reclamar" className="boton-primario mt-4 px-6">
          Reportar una luminaria
        </Link>
      </section>
    </div>
  );
}
