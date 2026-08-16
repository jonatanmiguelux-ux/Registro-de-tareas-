import type { Viewport } from "next";
import "./globals.css";

/**
 * Armazón mínimo, común a las dos zonas de la app.
 *
 * Acá no va ni encabezado ni navegación: la app del municipio y la del vecino
 * no se parecen en nada y no comparten nada visible. Cada una arma lo suyo en
 * `(municipio)/layout.tsx` y `(vecino)/layout.tsx`.
 *
 * Las carpetas entre paréntesis agrupan sin aparecer en la dirección: la
 * pantalla de cargar sigue siendo `/` y el formulario del vecino sigue siendo
 * `/reclamar`.
 */

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1d4ed8",
  // Instalada, la app ocupa la pantalla completa: sin esto el contenido queda
  // debajo de la muesca y de la barra de gestos en los celulares con notch.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-AR">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
