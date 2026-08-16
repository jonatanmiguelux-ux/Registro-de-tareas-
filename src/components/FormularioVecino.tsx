"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LOCALIDADES } from "@/lib/localidades";
import { TIPOS_FALLA } from "@/lib/reclamos-vecinales";
import { analizarNitidez, esDeNoche } from "@/lib/nitidez";
import { comprimirImagen, LUMINARIA } from "@/lib/comprimir";

/**
 * Formulario del vecino.
 *
 * Lo usa gente que entra una vez en la vida, desde el celular y con apuro. Por
 * eso: todo en una sola pantalla sin pasos, los errores se muestran al lado
 * del campo que falta, y nada de jerga municipal.
 */
export function FormularioVecino() {
  const router = useRouter();
  const inputFoto = useRef<HTMLInputElement>(null);

  const [tipo, setTipo] = useState("");
  const [localidad, setLocalidad] = useState("");
  const [calle, setCalle] = useState("");
  const [numero, setNumero] = useState("");
  const [observacion, setObservacion] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  /** Aviso de foto movida. Nunca impide enviar: sólo sugiere sacar otra. */
  const [movida, setMovida] = useState(false);
  /** La hora se lee en el navegador para no desajustar el HTML del servidor. */
  const [deNoche, setDeNoche] = useState(false);

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicado, setDuplicado] = useState<string | null>(null);
  /** Se enciende al primer intento: hasta entonces no se marca nada en rojo. */
  const [intentado, setIntentado] = useState(false);

  const faltantes = {
    tipo: !tipo,
    localidad: !localidad,
    calle: !calle.trim(),
    numero: !numero.trim(),
    observacion: !observacion.trim(),
    foto: !foto,
  };
  const completo = !Object.values(faltantes).some(Boolean);

  useEffect(() => setDeNoche(esDeNoche()), []);

  async function elegirFoto(lista: FileList | null) {
    const elegida = lista?.[0];
    if (!elegida) return;
    // La original queda puesta de entrada: si toca Enviar antes de que
    // termine de achicarse, sube la grande y no se pierde el reclamo.
    setFoto(elegida);
    setMovida(false);
    setVistaPrevia((anterior) => {
      if (anterior) URL.revokeObjectURL(anterior);
      return URL.createObjectURL(elegida);
    });

    // La borrosidad se mide sobre la **original**, antes de achicar.
    //
    // Medido en Chrome: hoy da lo mismo, porque `analizarNitidez` ya reduce a
    // 256 px por su cuenta y a esa escala achicar a 1600 no cambia nada —una
    // foto movida da 3 de las dos formas—. Se deja igual en este orden porque
    // es el que no depende de esa coincidencia: si mañana se bajan las
    // medidas de compresión, medir lo que la persona sacó de verdad sigue
    // siendo lo correcto.
    const nitidez = await analizarNitidez(elegida);
    if (nitidez?.borrosa) setMovida(true);

    // Recién ahora se achica, para mandar. El vecino está parado en la vereda
    // de noche con una raya de señal: subir 8 MB puede tardar minutos y
    // cortarse. Nadie va a leer letra en esta foto, sólo ver qué columna es.
    const achicada = await comprimirImagen(elegida, LUMINARIA);
    if (achicada !== elegida) setFoto(achicada);
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setIntentado(true);
    setError(null);
    // Si corrige la dirección después de ver el aviso, el aviso viejo estorba.
    setDuplicado(null);

    if (!completo) {
      setError("Completá todos los campos para poder enviar el reclamo.");
      return;
    }

    setEnviando(true);
    try {
      const cuerpo = new FormData();
      cuerpo.append("tipo", tipo);
      cuerpo.append("localidad", localidad);
      cuerpo.append("calle", calle);
      cuerpo.append("numero", numero);
      cuerpo.append("observacion", observacion);
      cuerpo.append("foto", foto!);

      const respuesta = await fetch("/api/reclamos-vecinales", {
        method: "POST",
        body: cuerpo,
      });
      const datos = await respuesta.json().catch(() => ({}));

      // Alguien ya avisó por esta misma luminaria. No es un error de quien
      // está cargando: hizo todo bien y llegó segundo. Se muestra aparte, en
      // azul y no en rojo, porque la noticia es buena — ya está en camino.
      if (datos.duplicado) {
        setDuplicado(datos.mensaje);
        return;
      }

      if (!respuesta.ok) {
        setError(datos.error ?? "No se pudo enviar el reclamo.");
        return;
      }

      router.push(`/reclamo/${datos.codigo}`);
    } catch {
      setError(
        "Falló la conexión. Revisá la señal y volvé a intentar; no se envió nada.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="space-y-5">
      <fieldset>
        <legend className="text-sm font-semibold">
          ¿Qué le pasa a la luminaria?
        </legend>
        <div className="mt-2 grid gap-2">
          {TIPOS_FALLA.map((t) => (
            <label
              key={t.valor}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                tipo === t.valor
                  ? "border-[var(--color-acento)] bg-[var(--color-acento-suave)]"
                  : "border-[var(--color-borde-fuerte)] bg-white hover:border-[var(--color-tinta-3)]"
              }`}
            >
              <input
                type="radio"
                name="tipo"
                value={t.valor}
                checked={tipo === t.valor}
                onChange={() => setTipo(t.valor)}
                className="mt-0.5 size-4 accent-[var(--color-acento)]"
              />
              <span>
                <span className="block text-sm font-medium">{t.etiqueta}</span>
                <span className="block text-xs text-[var(--color-tinta-2)]">
                  {t.ayuda}
                </span>
              </span>
            </label>
          ))}
        </div>
        <Falta visible={intentado && faltantes.tipo}>
          Elegí una de las tres opciones.
        </Falta>
      </fieldset>

      <Campo etiqueta="Localidad" falta={intentado && faltantes.localidad}>
        <select
          className="campo"
          value={localidad}
          onChange={(e) => setLocalidad(e.target.value)}
        >
          <option value="">Elegí una…</option>
          {LOCALIDADES.map((l) => (
            <option key={l.sigla} value={l.nombre}>
              {l.nombre}
            </option>
          ))}
        </select>
      </Campo>

      {/* Calle y después altura, en ese orden: es como se dice una dirección
          en voz alta, y como está impresa en la planilla de papel. */}
      <Campo etiqueta="Calle" falta={intentado && faltantes.calle}>
        <input
          className="campo"
          value={calle}
          onChange={(e) => setCalle(e.target.value)}
          placeholder="Ej.: San Juan"
        />
      </Campo>

      <Campo
        etiqueta="Altura"
        ayuda="El número de la casa más cercana"
        falta={intentado && faltantes.numero}
      >
        <input
          className="campo"
          inputMode="numeric"
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          placeholder="Ej.: 1250"
        />
      </Campo>

      <Campo
        etiqueta="Foto de la luminaria"
        ayuda="Sacala desde el celular, parado frente al poste"
        falta={intentado && faltantes.foto}
      >
        {/*
          `capture` le pide al celular que abra la cámara de atrás en vez de la
          galería: la foto tiene que ser de la luminaria que se está
          reportando, no una vieja ni una bajada de internet.

          En una computadora esto no hace nada —no hay cámara que abrir— y el
          navegador ofrece elegir un archivo. Es la única salida posible ahí, y
          no vale la pena bloquearla: quien reporta desde una PC igual necesita
          poder adjuntar la foto que sacó con el celular.
        */}
        <input
          ref={inputFoto}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => elegirFoto(e.target.files)}
        />
        {/* De noche, el recordatorio del flash. La web no puede prenderlo —lo
            decide la cámara del celular, que es otra app— pero sí puede
            avisarle a la persona antes de que la abra. */}
        {deNoche && !vistaPrevia && (
          <p className="mb-2 flex items-start gap-2 rounded-lg border border-[var(--color-alerta-borde)] bg-[var(--color-alerta-fondo)] px-3 py-2 text-xs">
            <IconoFoco />
            <span>
              Está oscuro. <span className="font-semibold">Prendé el flash</span>{" "}
              cuando se abra la cámara: sin luz, el poste no se distingue.
            </span>
          </p>
        )}

        {vistaPrevia ? (
          <div className="tarjeta overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={vistaPrevia}
              alt="Foto de la luminaria"
              className="max-h-72 w-full bg-slate-100 object-contain"
            />

            {/* Se avisa, no se bloquea. Rechazar una foto deja a alguien sin
                poder reportar, y eso es peor que una foto movida: la movida al
                menos se ve, y quien la revisa puede pedir otra. */}
            {movida && (
              <p className="flex items-start gap-2 border-t border-[var(--color-alerta-borde)] bg-[var(--color-alerta-fondo)] px-4 py-2.5 text-xs">
                <IconoAviso />
                <span>
                  La foto parece movida.{" "}
                  <span className="font-semibold">Si podés, sacá otra</span>{" "}
                  apoyando el codo o el celular en algo firme.
                </span>
              </p>
            )}

            <button
              type="button"
              className="w-full border-t border-[var(--color-borde)] px-4 py-2.5 text-sm font-medium transition hover:bg-slate-50"
              onClick={() => inputFoto.current?.click()}
            >
              Sacar otra
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="boton-secundario w-full"
            onClick={() => inputFoto.current?.click()}
          >
            <IconoCamara />
            Sacar una foto
          </button>
        )}
      </Campo>

      <Campo
        etiqueta="Contanos qué pasa"
        falta={intentado && faltantes.observacion}
      >
        <textarea
          className="campo min-h-24 resize-y"
          value={observacion}
          onChange={(e) => setObservacion(e.target.value)}
          maxLength={1000}
          placeholder="Ej.: hace una semana que no prende, la cuadra quedó a oscuras."
        />
      </Campo>

      {/* El correo ya no se pide: sale de la cuenta con la que entró, que es
          un dato verificado por Google en vez de tipeado a mano. Un campo
          menos es gente que llega hasta el final. */}

      {error && (
        <p className="rounded-lg border border-red-200 bg-[var(--color-mal-fondo)] px-4 py-3 text-sm text-[var(--color-mal)]">
          {error}
        </p>
      )}

      {duplicado && (
        <div
          role="status"
          className="rounded-lg border border-[var(--color-acento)] bg-[var(--color-acento-suave)] px-4 py-4"
        >
          <p className="text-sm font-semibold text-[var(--color-acento)]">
            Esa luminaria ya fue reportada
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-tinta-2)]">
            {duplicado}
          </p>
          <Link
            href="/alumbrado"
            className="mt-3 inline-block text-sm font-medium text-[var(--color-acento)] hover:underline"
          >
            Volver al inicio
          </Link>
        </div>
      )}

      <button type="submit" className="boton-primario w-full" disabled={enviando}>
        {enviando ? "Enviando…" : "Enviar el reclamo"}
      </button>

      <p className="text-center text-xs text-[var(--color-tinta-3)]">
        Te damos un número de seguimiento, y el reclamo queda guardado en tu
        cuenta.
      </p>
    </form>
  );
}

function Campo({
  etiqueta,
  ayuda,
  falta,
  children,
}: {
  etiqueta: string;
  ayuda?: string;
  falta?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold">{etiqueta}</span>
      {ayuda && (
        <span className="mt-0.5 block text-xs text-[var(--color-tinta-2)]">
          {ayuda}
        </span>
      )}
      <span className="mt-1.5 block">{children}</span>
      <Falta visible={Boolean(falta)}>Este dato es obligatorio.</Falta>
    </label>
  );
}

function IconoFoco() {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="var(--color-alerta)" strokeWidth="1.9"
      strokeLinecap="round" strokeLinejoin="round"
      className="mt-0.5 shrink-0" aria-hidden="true"
    >
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.6 10.8c.5.4.8 1 .9 1.6h5.4c.1-.6.4-1.2.9-1.6A6 6 0 0 0 12 3z" />
    </svg>
  );
}

function IconoAviso() {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="var(--color-alerta)" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      className="mt-0.5 shrink-0" aria-hidden="true"
    >
      <path d="M12 3.6 21.2 19.4H2.8z" />
      <path d="M12 10v4M12 17h.01" />
    </svg>
  );
}

function IconoCamara() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2a1.5 1.5 0 0 0 1.25-.67l.6-.9A1.5 1.5 0 0 1 9.8 4.7h4.4a1.5 1.5 0 0 1 1.25.73l.6.9A1.5 1.5 0 0 0 17.3 7h2.2A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z" />
      <circle cx="12" cy="13" r="3.4" />
    </svg>
  );
}

function Falta({
  visible,
  children,
}: {
  visible: boolean;
  children: React.ReactNode;
}) {
  if (!visible) return null;
  return (
    <span className="mt-1 block text-xs font-medium text-[var(--color-mal)]">
      {children}
    </span>
  );
}
