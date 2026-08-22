"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { RolUsuario } from "@prisma/client";
import { esPanolero, puedeVerPanol, puedeVerStockMoviles } from "@/lib/roles";

/**
 * Navegación de la app.
 *
 * En pantalla grande va arriba, al lado del nombre. En el celular va abajo,
 * como barra de pestañas: instalada en la pantalla de inicio la app compite
 * con las nativas, y ahí abajo es donde llega el pulgar de la mano que sostiene
 * el teléfono — la otra está ocupada con la planilla de papel.
 */

type Seccion = {
  href: string;
  texto: string;
  icono: (p: { activa: boolean }) => React.ReactElement;
};

/** Lo que ve cualquiera del municipio. El stock ya no va acá: depende del rol. */
const BASE: Seccion[] = [
  { href: "/", texto: "Cargar", icono: Camara },
  { href: "/registros", texto: "Registros", icono: Lista },
  { href: "/vecinos", texto: "Vecinos", icono: Vecinos },
  { href: "/tablero", texto: "Tablero", icono: Grafico },
];

const MOVILES: Seccion = { href: "/moviles", texto: "Móviles", icono: Camion };
const PANOL: Seccion = { href: "/panol", texto: "Pañol", icono: Caja };

/**
 * Arma la navegación según el rol.
 *
 * Se consulta la sesión desde el navegador —igual que el menú de usuario— para
 * no obligar al layout a leerla en el servidor, lo que volvería dinámicas todas
 * las pantallas. Mientras llega la respuesta se muestran las secciones base.
 *
 * - El pañolero ve **sólo el pañol**: nada más del sistema es lo suyo.
 * - El stock por móvil es de encargados en adelante; el pañol, de jefes.
 * - "Mi cuadrilla" aparece si la persona tiene una asignada.
 */
function useSecciones(): Seccion[] {
  const [datos, setDatos] = useState<{
    rol: RolUsuario;
    cuadrilla: number | null;
  } | null>(null);

  useEffect(() => {
    let vigente = true;
    fetch("/api/sesion")
      .then((r) => (r.ok ? r.json() : { usuario: null }))
      .then((d) => {
        if (vigente && d.usuario) {
          setDatos({ rol: d.usuario.rol, cuadrilla: d.usuario.cuadrilla ?? null });
        }
      })
      .catch(() => {});
    return () => {
      vigente = false;
    };
  }, []);

  if (!datos) return BASE;
  if (esPanolero(datos.rol)) return [PANOL];

  const lista = [...BASE];
  if (puedeVerStockMoviles(datos.rol)) lista.push(MOVILES);
  if (puedeVerPanol(datos.rol)) lista.push(PANOL);
  if (datos.cuadrilla !== null) {
    lista.push({ href: "/mi-cuadrilla", texto: "Mi cuadrilla", icono: Casco });
  }
  return lista;
}

/** `/` sólo coincide exacto; el resto también en sus subpáginas. */
function estaActiva(href: string, ruta: string): boolean {
  if (href === "/") return ruta === "/" || ruta.startsWith("/revisar");
  return ruta === href || ruta.startsWith(`${href}/`);
}

/**
 * Pantallas que usa gente de la calle, sin cuenta.
 *
 * Ahí no va la navegación del municipio: mostrarle a un vecino enlaces a
 * Registros, Tablero y Stock sólo consigue que los toque y termine en una
 * pantalla de login que no le corresponde.
 */
function esPublica(ruta: string): boolean {
  return (
    ruta === "/reclamar" ||
    ruta.startsWith("/reclamo/") ||
    ruta.startsWith("/acceso")
  );
}

export function NavegacionSuperior() {
  const ruta = usePathname();
  const secciones = useSecciones();

  if (esPublica(ruta)) return null;

  return (
    <nav className="hidden items-center gap-1 sm:flex">
      {secciones.map((s) => {
        const activa = estaActiva(s.href, ruta);
        return (
          <Link
            key={s.href}
            href={s.href}
            aria-current={activa ? "page" : undefined}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              activa
                ? "bg-[var(--color-acento-suave)] text-[var(--color-acento)]"
                : "text-[var(--color-tinta-2)] hover:bg-slate-100 hover:text-[var(--color-tinta)]"
            }`}
          >
            {s.texto}
          </Link>
        );
      })}
    </nav>
  );
}

export function NavegacionInferior() {
  const ruta = usePathname();
  const secciones = useSecciones();

  if (esPublica(ruta)) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--color-borde)] bg-white/95 backdrop-blur sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${secciones.length}, minmax(0, 1fr))`,
        }}
      >
        {secciones.map((s) => {
          const activa = estaActiva(s.href, ruta);
          const Icono = s.icono;
          return (
            <li key={s.href}>
              <Link
                href={s.href}
                aria-current={activa ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium transition ${
                  activa
                    ? "text-[var(--color-acento)]"
                    : "text-[var(--color-tinta-3)]"
                }`}
              >
                <Icono activa={activa} />
                {s.texto}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/*
 * Íconos. Trazo de 1.75 para que se distingan a tamaño chico sin engordar, y
 * relleno tenue cuando la pestaña está activa: así el estado no depende sólo
 * del color, que es lo que no ve quien tiene daltonismo.
 */

type Props = { activa: boolean };

const base = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function Camara({ activa }: Props) {
  return (
    <svg {...base} aria-hidden="true">
      <path
        d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2a1.5 1.5 0 0 0 1.25-.67l.6-.9A1.5 1.5 0 0 1 9.8 4.7h4.4a1.5 1.5 0 0 1 1.25.73l.6.9A1.5 1.5 0 0 0 17.3 7h2.2A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z"
        fill={activa ? "currentColor" : "none"}
        opacity={activa ? 0.16 : 1}
      />
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2a1.5 1.5 0 0 0 1.25-.67l.6-.9A1.5 1.5 0 0 1 9.8 4.7h4.4a1.5 1.5 0 0 1 1.25.73l.6.9A1.5 1.5 0 0 0 17.3 7h2.2A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z" />
      <circle cx="12" cy="13" r="3.4" />
    </svg>
  );
}

function Lista({ activa }: Props) {
  return (
    <svg {...base} aria-hidden="true">
      <rect
        x="3.5"
        y="4"
        width="17"
        height="16"
        rx="2.5"
        fill={activa ? "currentColor" : "none"}
        opacity={activa ? 0.16 : 1}
      />
      <rect x="3.5" y="4" width="17" height="16" rx="2.5" />
      <path d="M7.5 9h9M7.5 12.5h9M7.5 16h5" />
    </svg>
  );
}

function Grafico({ activa }: Props) {
  return (
    <svg {...base} aria-hidden="true">
      <rect
        x="3.5"
        y="4"
        width="17"
        height="16"
        rx="2.5"
        fill={activa ? "currentColor" : "none"}
        opacity={activa ? 0.16 : 1}
      />
      <rect x="3.5" y="4" width="17" height="16" rx="2.5" />
      <path d="M8 15.5v-3M12 15.5v-6M16 15.5v-4" />
    </svg>
  );
}

function Vecinos({ activa }: Props) {
  return (
    <svg {...base} aria-hidden="true">
      <path
        d="M4 19.5v-1.2a4.3 4.3 0 0 1 4.3-4.3h2.4a4.3 4.3 0 0 1 4.3 4.3v1.2z"
        fill={activa ? "currentColor" : "none"}
        opacity={activa ? 0.16 : 1}
      />
      <path d="M4 19.5v-1.2a4.3 4.3 0 0 1 4.3-4.3h2.4a4.3 4.3 0 0 1 4.3 4.3v1.2z" />
      <circle cx="9.5" cy="8" r="3.3" fill={activa ? "currentColor" : "none"} opacity={activa ? 0.16 : 1} />
      <circle cx="9.5" cy="8" r="3.3" />
      <path d="M16.5 19.5v-1.4a4.3 4.3 0 0 0-2-3.6M15.2 5.2a3.3 3.3 0 0 1 0 5.7" />
    </svg>
  );
}

function Caja({ activa }: Props) {
  return (
    <svg {...base} aria-hidden="true">
      <path
        d="M12 3.4 20 7.5v9L12 20.6 4 16.5v-9z"
        fill={activa ? "currentColor" : "none"}
        opacity={activa ? 0.16 : 1}
      />
      <path d="M12 3.4 20 7.5v9L12 20.6 4 16.5v-9z" />
      <path d="M4 7.5 12 11.6l8-4.1M12 11.6v9" />
    </svg>
  );
}

/** Camión, para "Móviles". */
function Camion({ activa }: Props) {
  return (
    <svg {...base} aria-hidden="true">
      <path
        d="M3 7h11v8H3zM14 10h3.2l2.8 2.8V15H14z"
        fill={activa ? "currentColor" : "none"}
        opacity={activa ? 0.16 : 1}
      />
      <path d="M3 7h11v8H3zM14 10h3.2l2.8 2.8V15H14z" />
      <path d="M3 15h1M20 15h.5" />
      <circle cx="7" cy="17" r="1.6" />
      <circle cx="17" cy="17" r="1.6" />
    </svg>
  );
}

/** Casco de obra, para "Mi cuadrilla". */
function Casco({ activa }: Props) {
  return (
    <svg {...base} aria-hidden="true">
      <path
        d="M4 16a8 8 0 0 1 16 0z"
        fill={activa ? "currentColor" : "none"}
        opacity={activa ? 0.16 : 1}
      />
      <path d="M4 16a8 8 0 0 1 16 0z" />
      <path d="M3 16h18" />
      <path d="M12 8V5.5M9.5 8.3l-.5-2M14.5 8.3l.5-2" />
    </svg>
  );
}
