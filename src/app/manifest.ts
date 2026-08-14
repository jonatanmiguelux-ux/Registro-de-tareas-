import type { MetadataRoute } from "next";

/**
 * Manifiesto de la PWA: es lo que permite instalar la app en la pantalla de
 * inicio del celular, con su ícono y sin la barra del navegador.
 *
 * Next lo sirve en /manifest.webmanifest y lo enlaza solo desde el <head>.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Registro de tareas",
    short_name: "Planillas",
    description:
      "Sacá una foto de la planilla de alumbrado público y quedan cargados los reclamos y los materiales.",
    start_url: "/",
    // Sin barra de direcciones: se ve y se usa como una app.
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f7f9",
    theme_color: "#1d4ed8",
    lang: "es-AR",
    dir: "ltr",
    categories: ["productivity", "utilities"],
    icons: [
      {
        src: "/icono/icono-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icono/icono-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // Android recorta el ícono con la forma que tenga el sistema (círculo,
      // cuadrado redondeado). Esta versión trae el dibujo más chico y el
      // fondo hasta el borde para que el recorte no se lleve nada puesto.
      {
        src: "/icono/icono-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    // Atajos al mantener apretado el ícono en la pantalla de inicio.
    shortcuts: [
      {
        name: "Cargar una planilla",
        url: "/",
        icons: [{ src: "/icono/icono-192.png", sizes: "192x192" }],
      },
      {
        name: "Ver registros",
        url: "/registros",
        icons: [{ src: "/icono/icono-192.png", sizes: "192x192" }],
      },
    ],
  };
}
