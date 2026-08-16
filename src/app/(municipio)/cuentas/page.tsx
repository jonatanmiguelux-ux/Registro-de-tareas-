import { prisma } from "@/lib/prisma";
import { requerirRol, NOMBRE_ROL } from "@/lib/sesion";
import type { RolUsuario, EstadoUsuario } from "@prisma/client";
import { formatearMomento } from "@/lib/fechas";
import { AccionesCuenta } from "@/components/AccionesCuenta";

export const dynamic = "force-dynamic";

/**
 * Administración de cuentas. Del jefe para arriba.
 *
 * El jefe habilita y da de baja gente —la gestión de todos los días—, pero el
 * rol de cada uno lo asigna sólo el administrador.
 *
 * Las pendientes van arriba de todo: son las que están esperando que alguien
 * haga algo, y es lo único de esta pantalla que tiene urgencia.
 */
export default async function PaginaCuentas() {
  // El jefe entra a gestionar altas y bajas; cambiar roles queda para el
  // administrador, y eso se resuelve fila por fila más abajo.
  const yo = await requerirRol("JEFE");
  const puedeCambiarRol = yo.rol === "ADMINISTRADOR";

  const usuarios = await prisma.user.findMany({
    // Sólo el personal. Las cuentas de vecino no piden aprobación ni ven nada
    // del municipio: mezclarlas acá taparía a los tres o cuatro empleados con
    // cientos de filas que no requieren ninguna decisión.
    where: { tipo: "PERSONAL" },
    orderBy: [{ creadoEn: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      rol: true,
      estado: true,
      creadoEn: true,
      habilitadoEn: true,
      habilitadoPor: true,
    },
  });

  const pendientes = usuarios.filter((u) => u.estado === "PENDIENTE");
  const resto = usuarios.filter((u) => u.estado !== "PENDIENTE");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="titulo-pagina">Cuentas</h1>
        <p className="bajada mt-1.5">
          Quién del municipio puede entrar y qué puede hacer. Iniciar sesión
          con Google no alcanza: la cuenta tiene que estar habilitada acá. Las
          cuentas de vecinos no aparecen en esta lista.
        </p>
      </div>

      {pendientes.length > 0 && (
        <section className="tarjeta overflow-hidden border-[var(--color-alerta-borde)]">
          <div className="tarjeta-titulo bg-[var(--color-alerta-fondo)]">
            <h2 className="text-sm font-semibold text-[var(--color-alerta)]">
              {pendientes.length} cuenta{pendientes.length === 1 ? "" : "s"}{" "}
              esperando aprobación
            </h2>
          </div>
          <ul className="divide-y divide-[var(--color-borde)]">
            {pendientes.map((u) => (
              <li key={u.id} className="p-4">
                <Fila
                  usuario={u}
                  esYo={u.id === yo.id}
                  puedeCambiarRol={puedeCambiarRol}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="tarjeta overflow-hidden">
        <div className="tarjeta-titulo">
          <h2 className="text-sm font-semibold">Cuentas habilitadas</h2>
          <span className="text-xs text-[var(--color-tinta-3)]">
            {resto.filter((u) => u.estado === "ACTIVO").length} activa
            {resto.filter((u) => u.estado === "ACTIVO").length === 1 ? "" : "s"}
          </span>
        </div>
        {resto.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--color-tinta-3)]">
            Todavía no hay ninguna cuenta habilitada.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--color-borde)]">
            {resto.map((u) => (
              <li key={u.id} className="p-4">
                <Fila
                  usuario={u}
                  esYo={u.id === yo.id}
                  puedeCambiarRol={puedeCambiarRol}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs leading-relaxed text-[var(--color-tinta-3)]">
        Dar de baja una cuenta no la borra: se le retira el acceso y queda el
        registro de que existió. El efecto es inmediato — en cuanto toque
        cualquier pantalla, esa persona sale.
      </p>
    </div>
  );
}

function Fila({
  usuario,
  esYo,
  puedeCambiarRol,
}: {
  usuario: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    rol: RolUsuario;
    estado: EstadoUsuario;
    creadoEn: Date;
    habilitadoEn: Date | null;
    habilitadoPor: string | null;
  };
  esYo: boolean;
  puedeCambiarRol: boolean;
}) {
  const etiquetaEstado = {
    PENDIENTE: {
      texto: "Esperando",
      clase: "bg-[var(--color-alerta-fondo)] text-[var(--color-alerta)]",
    },
    ACTIVO: {
      texto: "Activa",
      clase: "bg-[var(--color-bien-fondo)] text-[var(--color-bien)]",
    },
    BLOQUEADO: {
      texto: "Sin acceso",
      clase: "bg-[var(--color-mal-fondo)] text-[var(--color-mal)]",
    },
  }[usuario.estado];

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Avatar nombre={usuario.name} imagen={usuario.image} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium">
            {usuario.name ?? usuario.email ?? "Sin nombre"}
          </span>
          <span className={`etiqueta ${etiquetaEstado.clase}`}>
            {etiquetaEstado.texto}
          </span>
          {/* El operario es el caso normal y no se etiqueta: marcar a todo el
              mundo haría que la etiqueta no distinga nada. */}
          {usuario.rol !== "OPERARIO" && (
            <span className="etiqueta bg-[var(--color-acento-suave)] text-[var(--color-acento)]">
              {NOMBRE_ROL[usuario.rol]}
            </span>
          )}
          {esYo && (
            <span className="text-xs text-[var(--color-tinta-3)]">(vos)</span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-[var(--color-tinta-3)]">
          {usuario.email}
          {" · pidió acceso el "}
          {formatearMomento(usuario.creadoEn)}
          {usuario.habilitadoEn &&
            ` · habilitada el ${formatearMomento(usuario.habilitadoEn)}`}
        </p>
      </div>

      <AccionesCuenta
        id={usuario.id}
        estado={usuario.estado}
        rol={usuario.rol}
        esYo={esYo}
        puedeCambiarRol={puedeCambiarRol}
      />
    </div>
  );
}

function Avatar({
  nombre,
  imagen,
}: {
  nombre: string | null;
  imagen: string | null;
}) {
  if (imagen) {
    return (
      // Foto de perfil de Google: <img> evita configurar dominios en el
      // optimizador de Next para una imagen de 40 píxeles.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imagen}
        alt=""
        className="size-10 shrink-0 rounded-full bg-slate-100 object-cover"
      />
    );
  }

  const inicial = (nombre ?? "?").trim().charAt(0).toUpperCase();
  return (
    <span
      className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--color-acento-suave)] text-sm font-semibold text-[var(--color-acento)]"
      aria-hidden="true"
    >
      {inicial}
    </span>
  );
}
