import type { NextConfig } from "next";

// La foto se sube a un route handler (`/api/planillas`), que en el App Router
// recibe el cuerpo en streaming y no tiene el límite de tamaño de las server
// actions. El tope real de 20 MB se valida ahí mismo.
const nextConfig: NextConfig = {};

export default nextConfig;
