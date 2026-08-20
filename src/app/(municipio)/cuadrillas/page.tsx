import { headers } from "next/headers";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { requerirRol } from "@/lib/sesion";
import { listarCuadrillas } from "@/lib/cuadrillas-db";
import { describirZona, localidadesSinAsignar } from "@/lib/cuadrillas";
import { LOCALIDADES } from "@/lib/localidades";
import { RepartoCuadrillas } from "@/components/RepartoCuadrillas";
import { AccesoCelular } from "@/components/AccesoCelular";

export const dynamic = "force-dynamic";

/**
 * El reparto de zonas. Del encargado para arriba.
 *
 * Cambiar quién cubre qué es una decisión de gestión, no técnica: tiene que
 * poder hacerse desde acá y no editando el código.
 */
export default async function PaginaCuadrillas() {
  const yo = await requerirRol("ENCARGADO");
  const esAdmin = yo.rol === "ADMINISTRADOR";

  const cuadrillas = await listarCuadrillas();
  const sinAsignar = localidadesSinAsignar(cuadrillas);

  // El acceso desde el celular lo administra sólo el administrador. Para el
  // resto, esta parte ni se arma: es una llave, no un dato más.
  const accesos = esAdmin ? await armarAccesos() : [];

  // Cuántos reclamos de vecinos tiene cada una esperando, para que quien
  // reparte vea el efecto de lo que está por mover.
  const pendientes = await prisma.reclamoVecinal.groupBy({
    by: ["cuadrilla"],
    where: { estado: "RECIBIDO" },
    _count: { _all: true },
  });
  const porCuadrilla = new Map(
    pendientes.map((p) => [p.cuadrilla, p._count._all]),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="titulo-pagina">Cuadrillas y zonas</h1>
        <p className="bajada mt-1.5">
          Qué localidades cubre cada cuadrilla. Los reclamos que cargan los
          vecinos se derivan solos según este reparto.
        </p>
      </div>

      {sinAsignar.length > 0 && (
        <div className="rounded-[var(--radius-tarjeta)] border border-[var(--color-alerta-borde)] bg-[var(--color-alerta-fondo)] px-4 py-3 text-sm">
          <p className="font-semibold text-[var(--color-alerta)]">
            {sinAsignar.length} localidad
            {sinAsignar.length === 1 ? "" : "es"} sin cuadrilla
          </p>
          <p className="mt-0.5 text-[var(--color-tinta-2)]">
            Los reclamos de {sinAsignar.join(", ")} no le van a llegar a ningún
            equipo: quedan aparte en la bandeja de Vecinos hasta que alguien los
            mire.
          </p>
        </div>
      )}

      <RepartoCuadrillas
        cuadrillas={cuadrillas.map((c) => ({
          numero: c.numero,
          localidades: c.localidades,
          zona: describirZona(c.localidades),
          pendientes: porCuadrilla.get(c.numero) ?? 0,
        }))}
        localidades={LOCALIDADES.map((l) => l.nombre)}
      />

      {esAdmin && accesos.length > 0 && (
        <section className="tarjeta overflow-hidden">
          <div className="tarjeta-titulo">
            <h2 className="text-sm font-semibold">Celulares de cuadrilla</h2>
          </div>
          <div className="border-b border-[var(--color-borde)] px-4 py-3">
            <p className="text-xs leading-relaxed text-[var(--color-tinta-2)]">
              Cada cuadrilla puede tener un celular que entra directo a sus
              reclamos, sin cuenta de Google. Generá el acceso, abrí el enlace
              una vez en el teléfono del equipo, y ese celular queda fijado a la
              cuadrilla. Ese teléfono ve sólo su zona: no llega a planillas,
              stock ni a las otras cuadrillas.
            </p>
          </div>
          <ul className="divide-y divide-[var(--color-borde)]">
            {accesos.map((a) => (
              <li key={a.numero} className="p-4">
                <p className="mb-2.5 text-sm font-semibold">
                  Cuadrilla {a.numero}
                </p>
                <AccesoCelular
                  numero={a.numero}
                  enlace={a.enlace}
                  qr={a.qr}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-xs leading-relaxed text-[var(--color-tinta-3)]">
        El número de cuadrilla es el mismo que el Móvil N.º de la planilla de
        papel: es lo que permite cruzar un reclamo de vecino con el trabajo que
        después aparece cargado. Cambiar el reparto no toca los reclamos ya
        derivados — sólo afecta a los que entren de ahora en más.
      </p>
    </div>
  );
}

/**
 * Arma, para cada cuadrilla, su enlace de acceso desde el celular y el QR de
 * ese enlace. El enlace se construye con el dominio real de la petición —el
 * mismo por el que entró el administrador— para que apunte a donde vive la app.
 */
async function armarAccesos() {
  const filas = await prisma.cuadrilla.findMany({
    orderBy: { numero: "asc" },
    select: { numero: true, tokenAcceso: true },
  });

  const cabeceras = await headers();
  const host =
    cabeceras.get("x-forwarded-host") ?? cabeceras.get("host") ?? "";
  const proto =
    cabeceras.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const base = host ? `${proto}://${host}` : "";

  return Promise.all(
    filas.map(async (c) => {
      if (!c.tokenAcceso) {
        return { numero: c.numero, enlace: null, qr: null };
      }
      const enlace = `${base}/c/${c.tokenAcceso}`;
      const qr = await QRCode.toDataURL(enlace, {
        margin: 1,
        width: 220,
        errorCorrectionLevel: "M",
      });
      return { numero: c.numero, enlace, qr };
    }),
  );
}
