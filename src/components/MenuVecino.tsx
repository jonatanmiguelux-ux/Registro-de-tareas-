"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Lo que ve el vecino arriba a la derecha: sus reclamos y salir.
 *
 * Pide los datos desde el navegador para no obligar al layout a leer la
 * sesión: si lo hiciera, la página que explica el servicio dejaría de ser
 * estática, y esa es la que más se abre —llega gente desde un folleto o un
 * mensaje reenviado— y la que conviene que cargue al instante.
 */
export function MenuVecino() {
  const ruta = usePathname();
  const [entrado, setEntrado] = useState<boolean | null>(null);

  useEffect(() => {
    let vigente = true;
    fetch("/api/sesion")
      .then((r) => (r.ok ? r.json() : { usuario: null }))
      .then((d) => {
        if (vigente) setEntrado(Boolean(d.usuario));
      })
      .catch(() => {
        if (vigente) setEntrado(false);
      });
    return () => {
      vigente = false;
    };
  }, [ruta]);

  // Mientras no se sabe, no se muestra nada: un botón que aparece y
  // desaparece es peor que uno que tarda un instante.
  if (entrado === null || ruta === "/ingresar") return null;

  if (!entrado) {
    return (
      <Link
        href="/ingresar"
        className="text-sm font-medium text-[var(--color-acento)]"
      >
        Entrar
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/mis-reclamos"
        className="text-sm font-medium text-[var(--color-acento)]"
      >
        Mis reclamos
      </Link>
      {/* Enlace directo a /salir: borra la galleta y redirige, sin
          formulario ni JavaScript. */}
      <a
        href="/salir"
        className="text-sm text-[var(--color-tinta-3)] transition hover:text-[var(--color-tinta)]"
      >
        Salir
      </a>
    </div>
  );
}
