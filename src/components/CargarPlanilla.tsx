"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { encolar, hayCola } from "@/lib/cola";
import { comprimirImagen, describirAhorro, PLANILLA } from "@/lib/comprimir";

export function CargarPlanilla() {
  const router = useRouter();
  const inputCamara = useRef<HTMLInputElement>(null);
  const inputArchivo = useRef<HTMLInputElement>(null);

  const [archivo, setArchivo] = useState<File | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  const [analizando, setAnalizando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardada, setGuardada] = useState(false);
  const [ahorro, setAhorro] = useState<string | null>(null);

  async function elegir(lista: FileList | null) {
    const elegido = lista?.[0];
    if (!elegido) return;
    setError(null);
    setGuardada(false);
    setAhorro(null);

    // Se guarda el original de entrada: si la persona aprieta Analizar antes
    // de que termine de achicarse, sube el grande y no se pierde nada.
    setArchivo(elegido);
    setVistaPrevia((anterior) => {
      if (anterior) URL.revokeObjectURL(anterior);
      return URL.createObjectURL(elegido);
    });

    // Achicarla acá y no en el servidor: lo que se ahorra es la subida, que
    // es la parte lenta cuando la cuadrilla está en la calle con una raya de
    // señal. Se cuida la resolución para que la IA siga leyendo la letra.
    const achicado = await comprimirImagen(elegido, PLANILLA);
    if (achicado !== elegido) {
      setArchivo(achicado);
      setAhorro(describirAhorro(elegido.size, achicado.size));
    }
  }

  function limpiar() {
    setArchivo(null);
    setAhorro(null);
    setVistaPrevia((anterior) => {
      if (anterior) URL.revokeObjectURL(anterior);
      return null;
    });
  }

  /**
   * Deja la foto guardada en el celular para subirla cuando vuelva la señal.
   *
   * Es el final feliz de estar sin conexión: quien sacó la foto puede seguir
   * con el próximo poste en vez de quedarse esperando a que haya señal.
   */
  async function guardarParaDespues(): Promise<boolean> {
    if (!archivo || !hayCola()) return false;
    try {
      await encolar(archivo);
      // Despierta a la cola del layout, que se encarga de subirla.
      window.dispatchEvent(new Event("planilla-encolada"));
      setGuardada(true);
      limpiar();
      return true;
    } catch {
      return false;
    }
  }

  async function analizar() {
    if (!archivo) return;
    setAnalizando(true);
    setError(null);

    // Se intenta subir SIEMPRE, sin preguntarle antes a `navigator.onLine`.
    // Esa bandera del navegador miente seguido —dice "sin conexión" habiendo—,
    // y usarla para no intentar hacía que planillas con señal se guardaran como
    // si no la hubiera. La única prueba fiable de que no hay conexión es que el
    // intento de verdad falle, y eso lo maneja el `catch` de abajo.
    try {
      const cuerpo = new FormData();
      cuerpo.append("imagen", archivo);

      const respuesta = await fetch("/api/planillas", {
        method: "POST",
        body: cuerpo,
      });
      const datos = await respuesta.json();

      if (!respuesta.ok) {
        // El servidor contestó, así que la planilla ya quedó registrada:
        // reencolarla crearía una segunda para la misma foto.
        setError(datos.error ?? "No se pudo analizar la planilla.");
        return;
      }

      router.push(`/revisar/${datos.id}`);
    } catch {
      // Acá no hubo respuesta del servidor: la foto nunca llegó, así que
      // guardarla es seguro y no duplica nada.
      if (await guardarParaDespues()) return;
      setError(
        "Falló la conexión y este navegador no puede guardar la foto para después. Revisá la señal y volvé a intentar.",
      );
    } finally {
      setAnalizando(false);
    }
  }

  return (
    <div className="space-y-4">
      <input
        ref={inputCamara}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => elegir(e.target.files)}
      />
      <input
        ref={inputArchivo}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="hidden"
        onChange={(e) => elegir(e.target.files)}
      />

      {!vistaPrevia ? (
        // Sin foto elegida: la zona de captura ocupa el centro de la pantalla.
        // El botón de cámara es el grande porque es lo que se hace en la calle;
        // elegir un archivo es el caso de escritorio.
        <div className="tarjeta border-dashed border-[var(--color-borde-fuerte)] p-6 text-center sm:p-10">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--color-acento-suave)]">
            <IconoCamara />
          </span>
          <p className="mt-4 text-base font-semibold">Sacale una foto</p>
          <p className="bajada mx-auto mt-1 max-w-sm">
            La planilla completa, con los cuatro bordes a la vista y sin sombras
            encima de la tabla. No importa si sale de costado.
          </p>

          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <button
              type="button"
              className="boton-primario"
              onClick={() => inputCamara.current?.click()}
              disabled={analizando}
            >
              <IconoCamaraChica />
              Tomar foto
            </button>
            <button
              type="button"
              className="boton-secundario"
              onClick={() => inputArchivo.current?.click()}
              disabled={analizando}
            >
              Elegir una imagen
            </button>
          </div>
        </div>
      ) : (
        <div className="tarjeta overflow-hidden">
          {/* Imagen local del navegador: <img> evita el optimizador de Next. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={vistaPrevia}
            alt="Vista previa de la planilla"
            className="max-h-[26rem] w-full bg-slate-100 object-contain"
          />
          <div className="flex items-center justify-between gap-3 border-t border-[var(--color-borde)] px-4 py-3 text-sm">
            <span className="min-w-0 truncate font-medium">
              {archivo?.name}
              <span className="ml-2 font-normal text-[var(--color-tinta-3)]">
                {archivo ? `${(archivo.size / 1024 / 1024).toFixed(1)} MB` : ""}
                {/* Que se vea que se achicó explica por qué sube rápido, y
                    tranquiliza a quien recuerda haber sacado una foto grande. */}
                {ahorro && ` · achicada de ${ahorro.split(" → ")[0]}`}
              </span>
            </span>
            <button
              type="button"
              className="boton-fantasma shrink-0 min-h-0 px-2 py-1 text-xs"
              onClick={limpiar}
              disabled={analizando}
            >
              Cambiar
            </button>
          </div>
        </div>
      )}

      {guardada && (
        <Aviso tono="alerta">
          <span className="font-semibold">Foto guardada.</span> No hay señal
          ahora, así que se va a subir sola en cuanto vuelva la conexión. Podés
          seguir con la próxima planilla.
        </Aviso>
      )}

      {error && <Aviso tono="mal">{error}</Aviso>}

      {archivo && (
        <div>
          <button
            type="button"
            className="boton-primario w-full"
            onClick={analizar}
            disabled={analizando}
          >
            {analizando ? (
              <>
                <Girador />
                Leyendo la planilla…
              </>
            ) : (
              "Analizar planilla"
            )}
          </button>

          {analizando && (
            <p className="mt-2 text-center text-sm text-[var(--color-tinta-2)]">
              Suele tardar entre 20 y 40 segundos. No cierres la pantalla.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Aviso({
  tono,
  children,
}: {
  tono: "alerta" | "mal";
  children: React.ReactNode;
}) {
  const estilo =
    tono === "alerta"
      ? "border-[var(--color-alerta-borde)] bg-[var(--color-alerta-fondo)] text-[var(--color-tinta)]"
      : "border-red-200 bg-[var(--color-mal-fondo)] text-[var(--color-mal)]";
  return (
    <p className={`rounded-lg border px-4 py-3 text-sm ${estilo}`}>{children}</p>
  );
}

function IconoCamara() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-acento)"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2a1.5 1.5 0 0 0 1.25-.67l.6-.9A1.5 1.5 0 0 1 9.8 4.7h4.4a1.5 1.5 0 0 1 1.25.73l.6.9A1.5 1.5 0 0 0 17.3 7h2.2A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z" />
      <circle cx="12" cy="13" r="3.4" />
    </svg>
  );
}

function IconoCamaraChica() {
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

function Girador() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        opacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
