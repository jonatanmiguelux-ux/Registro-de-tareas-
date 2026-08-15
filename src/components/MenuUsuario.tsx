"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Usuario = {
  nombre: string | null;
  email: string | null;
  imagen: string | null;
  rol: "OPERARIO" | "ADMINISTRADOR";
  estado: "PENDIENTE" | "ACTIVO" | "BLOQUEADO";
};

/**
 * Quién está conectado, en el encabezado.
 *
 * Pide los datos desde el navegador y no desde el servidor para que el layout
 * no tenga que leer la sesión: si la leyera, todas las pantallas pasarían a
 * renderizarse a demanda y la de cargar dejaría de poder abrirse sin señal.
 */
export function MenuUsuario() {
  const ruta = usePathname();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    let vigente = true;
    fetch("/api/sesion")
      .then((r) => (r.ok ? r.json() : { usuario: null }))
      .then((d) => {
        if (vigente) setUsuario(d.usuario ?? null);
      })
      .catch(() => {});
    return () => {
      vigente = false;
    };
  }, [ruta]);

  // Cerrar el menú al tocar en cualquier otro lado.
  useEffect(() => {
    if (!abierto) return;
    const cerrar = () => setAbierto(false);
    document.addEventListener("click", cerrar);
    return () => document.removeEventListener("click", cerrar);
  }, [abierto]);

  // En la pantalla de acceso no hay nada que mostrar.
  if (!usuario || ruta.startsWith("/acceso")) return null;

  const nombreCorto = (usuario.nombre ?? usuario.email ?? "").split(" ")[0];

  return (
    <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="flex items-center gap-2 rounded-full p-0.5 pr-2 transition hover:bg-slate-100"
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={abierto}
      >
        <Avatar usuario={usuario} />
        <span className="hidden text-sm font-medium sm:inline">
          {nombreCorto}
        </span>
      </button>

      {abierto && (
        <div
          role="menu"
          className="tarjeta absolute right-0 top-full z-30 mt-2 w-60 overflow-hidden p-0 shadow-lg"
        >
          <div className="border-b border-[var(--color-borde)] px-4 py-3">
            <p className="truncate text-sm font-medium">
              {usuario.nombre ?? "Sin nombre"}
            </p>
            <p className="mt-0.5 truncate text-xs text-[var(--color-tinta-3)]">
              {usuario.email}
            </p>
            <p className="mt-1.5 text-xs font-medium text-[var(--color-tinta-2)]">
              {usuario.rol === "ADMINISTRADOR" ? "Administrador" : "Operario"}
            </p>
          </div>

          {usuario.rol === "ADMINISTRADOR" && (
            <Link
              href="/cuentas"
              className="block px-4 py-2.5 text-sm transition hover:bg-slate-50"
              onClick={() => setAbierto(false)}
            >
              Cuentas
            </Link>
          )}

          {/* Formulario y no fetch: cerrar sesión tiene que limpiar la cookie
              del servidor, y el endpoint de Auth.js espera un POST. */}
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="w-full border-t border-[var(--color-borde)] px-4 py-2.5 text-left text-sm transition hover:bg-slate-50"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function Avatar({ usuario }: { usuario: Usuario }) {
  if (usuario.imagen) {
    // Foto de perfil de Google: <img> evita configurar dominios remotos en el
    // optimizador de Next para una imagen de 32 píxeles.
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={usuario.imagen}
        alt=""
        className="size-8 rounded-full bg-slate-100 object-cover"
      />
    );
  }

  const inicial = (usuario.nombre ?? usuario.email ?? "?")
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <span
      className="grid size-8 place-items-center rounded-full bg-[var(--color-acento-suave)] text-xs font-semibold text-[var(--color-acento)]"
      aria-hidden="true"
    >
      {inicial}
    </span>
  );
}
