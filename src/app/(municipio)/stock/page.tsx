import { redirect } from "next/navigation";
import { requerirUsuario, puedeVerStockMoviles } from "@/lib/sesion";

export const dynamic = "force-dynamic";

/**
 * La vieja pantalla de stock global quedó dividida en dos: el pañol (depósito
 * central) y el stock por móvil. Esta dirección sigue viva sólo para no romper
 * enlaces guardados: manda a cada uno adonde le corresponde según su rol.
 *
 * Al pañolero, `requerirUsuario` ya lo mandó al pañol antes de llegar acá.
 */
export default async function PaginaStock() {
  const usuario = await requerirUsuario();
  redirect(puedeVerStockMoviles(usuario.rol) ? "/moviles" : "/");
}
