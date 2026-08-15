import type { NextConfig } from "next";

// La foto se sube a un route handler (`/api/planillas`), que en el App Router
// recibe el cuerpo en streaming y no tiene el límite de tamaño de las server
// actions. El tope real de 20 MB se valida ahí mismo.
const nextConfig: NextConfig = {
  // Empaqueta el servidor con sólo las dependencias que realmente usa, para
  // que la imagen de Docker no cargue con todo node_modules.
  output: "standalone",
};

export default nextConfig;
