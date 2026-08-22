import { redirect } from "next/navigation";
import { usuarioActual, esPanolero } from "@/lib/sesion";

export const dynamic = "force-dynamic";

/**
 * Adonde cae quien acaba de iniciar sesión.
 *
 * Existe para no tener que decidir esto en la pantalla de cargar: esa es
 * estática —para poder abrirse sin señal— y por lo tanto no puede consultar
 * la base para saber si la cuenta está habilitada. Acá sí, y de paso quien
 * todavía espera aprobación no llega a ver una pantalla que no va a poder
 * usar.
 */
export default async function Entrando() {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/acceso");
  if (usuario.estado !== "ACTIVO") redirect("/acceso/pendiente");
  // El pañolero va directo a su pantalla; el resto, a cargar.
  redirect(esPanolero(usuario.rol) ? "/panol" : "/");
}
