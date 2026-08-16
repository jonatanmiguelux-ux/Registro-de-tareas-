import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatearMomento } from "@/lib/fechas";
import { etiquetaDeFalla } from "@/lib/reclamos-vecinales";
import { requerirVecino } from "@/lib/sesion";

export const dynamic = "force-dynamic";

/**
 * Seguimiento del reclamo, para el vecino que lo cargó.
 *
 * Nació como página pública, con el código de seguimiento como única llave.
 * Desde que reportar exige cuenta, eso ya no alcanza: el código viaja en la
 * barra del navegador, queda en el historial y se comparte en una captura, y
 * con él a la vista **cualquiera con una cuenta podía leer el reclamo de otro**
 * —con la dirección de su casa adentro—. Ahora se comprueba de quién es.
 *
 * Pasan dos: el dueño, y el personal del municipio, que necesita poder abrir
 * cualquiera para atenderlo. Los reclamos viejos, cargados antes de que la
 * cuenta fuera obligatoria, no tienen dueño: esos los ve sólo el municipio.
 *
 * Cuando no corresponde se responde "no existe" y no "no podés": decir cuál de
 * las dos cosas es confirmaría que ese código es de alguien.
 */
export default async function PaginaSeguimiento({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const usuario = await requerirVecino();
  const { codigo } = await params;

  const reclamo = await prisma.reclamoVecinal.findUnique({
    where: { codigo: decodeURIComponent(codigo).toUpperCase() },
    select: {
      codigo: true,
      tipo: true,
      localidad: true,
      calle: true,
      numero: true,
      observacion: true,
      estado: true,
      nroIncidente: true,
      creadoEn: true,
      derivadoEn: true,
      vecinoId: true,
    },
  });

  if (!reclamo) notFound();

  const esDelMunicipio = usuario.tipo === "PERSONAL";
  const esMio = reclamo.vecinoId !== null && reclamo.vecinoId === usuario.id;
  if (!esMio && !esDelMunicipio) notFound();

  const pasos = [
    {
      titulo: "Reclamo recibido",
      detalle: formatearMomento(reclamo.creadoEn),
      hecho: true,
    },
    {
      titulo: "Cargado en el sistema del municipio",
      detalle: reclamo.nroIncidente
        ? `N.º de incidente ${reclamo.nroIncidente}`
        : "En cola",
      hecho: reclamo.estado === "DERIVADO",
    },
  ];

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="titulo-pagina">Tu reclamo</h1>
        <p className="bajada mt-2">
          Número de seguimiento{" "}
          <span className="font-semibold tracking-wide text-[var(--color-tinta)]">
            {reclamo.codigo}
          </span>
          . Guardalo para volver a esta página.
        </p>
      </div>

      {reclamo.estado === "DESCARTADO" && (
        <p className="rounded-lg border border-[var(--color-borde-fuerte)] bg-white px-4 py-3 text-sm">
          Este reclamo no pudo seguir adelante. Puede ser que ya hubiera otro
          por la misma luminaria, o que falten datos para encontrarla. Si sigue
          el problema, cargá uno nuevo con la mayor precisión posible.
        </p>
      )}

      <section className="tarjeta overflow-hidden">
        <div className="tarjeta-titulo">
          <h2 className="text-sm font-semibold">En qué anda</h2>
        </div>
        <ol className="divide-y divide-[var(--color-borde)]">
          {pasos.map((paso) => (
            <li key={paso.titulo} className="flex items-start gap-3 px-4 py-3">
              <span
                className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-xs font-bold ${
                  paso.hecho
                    ? "bg-[var(--color-bien-fondo)] text-[var(--color-bien)]"
                    : "bg-slate-100 text-[var(--color-tinta-3)]"
                }`}
                aria-hidden="true"
              >
                {paso.hecho ? "✓" : "·"}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{paso.titulo}</span>
                <span className="block text-xs text-[var(--color-tinta-2)]">
                  {paso.detalle}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="tarjeta overflow-hidden">
        <div className="tarjeta-titulo">
          <h2 className="text-sm font-semibold">Lo que cargaste</h2>
        </div>
        <dl className="divide-y divide-[var(--color-borde)] text-sm">
          <Dato titulo="Problema" valor={etiquetaDeFalla(reclamo.tipo)} />
          <Dato
            titulo="Dirección"
            valor={`${reclamo.calle} ${reclamo.numero}, ${reclamo.localidad}`}
          />
          <Dato titulo="Descripción" valor={reclamo.observacion} />
        </dl>
      </section>

      <p className="text-center text-sm">
        <Link
          href="/reclamar"
          className="font-semibold text-[var(--color-acento)] hover:underline"
        >
          Cargar otro reclamo
        </Link>
      </p>
    </div>
  );
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="px-4 py-3">
      <dt className="text-xs text-[var(--color-tinta-3)]">{titulo}</dt>
      <dd className="mt-0.5 break-words">{valor}</dd>
    </div>
  );
}
