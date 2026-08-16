"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LOCALIDADES } from "@/lib/localidades";
import { TIPOS_FALLA } from "@/lib/reclamos-vecinales";

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

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  function elegirFoto(lista: FileList | null) {
    const elegida = lista?.[0];
    if (!elegida) return;
    setFoto(elegida);
    setVistaPrevia((anterior) => {
      if (anterior) URL.revokeObjectURL(anterior);
      return URL.createObjectURL(elegida);
    });
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setIntentado(true);
    setError(null);

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
        ayuda="Ayuda a encontrar el poste exacto"
        falta={intentado && faltantes.foto}
      >
        <input
          ref={inputFoto}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => elegirFoto(e.target.files)}
        />
        {vistaPrevia ? (
          <div className="tarjeta overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={vistaPrevia}
              alt="Foto de la luminaria"
              className="max-h-72 w-full bg-slate-100 object-contain"
            />
            <button
              type="button"
              className="w-full border-t border-[var(--color-borde)] px-4 py-2.5 text-sm font-medium transition hover:bg-slate-50"
              onClick={() => inputFoto.current?.click()}
            >
              Cambiar la foto
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="boton-secundario w-full"
            onClick={() => inputFoto.current?.click()}
          >
            Sacar o elegir una foto
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
