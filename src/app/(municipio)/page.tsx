import { CargarPlanilla } from "@/components/CargarPlanilla";
import { PlanillasSinRevisar } from "@/components/PlanillasSinRevisar";
import { requerirUsuario } from "@/lib/sesion";

export const dynamic = "force-dynamic";

/**
 * Pantalla de cargar.
 *
 * **No lleva datos del servidor**: todo lo que necesite consultar la base va
 * en un componente cliente (ver PlanillasSinRevisar). Eso se mantiene, porque
 * es lo que permite que el service worker guarde esta pantalla y se pueda
 * abrir sin señal para sacar la foto que queda en cola.
 *
 * Lo que sí lleva es la guardia de sesión. Antes no la tenía —era estática de
 * punta a punta— y eso dejaba que **una cuenta de vecino viera la pantalla de
 * cargar planillas**. No podía crear ninguna, porque la API la rechazaba,
 * pero veía una puerta que no es suya.
 *
 * Que ahora sea dinámica no rompe el uso sin señal: el service worker va
 * siempre a la red primero y sólo usa la copia guardada cuando el pedido
 * falla. Con señal, la guardia corre y el vecino se va a su lado; sin señal,
 * se sirve la copia que esa persona ya se había ganado estando conectada.
 */
export default async function Inicio() {
  await requerirUsuario();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="titulo-pagina">Cargar una planilla</h1>
        <p className="bajada mt-1.5">
          La IA la lee y después vas a poder corregir todo antes de guardar.
        </p>
      </div>

      <CargarPlanilla />
      <PlanillasSinRevisar />
    </div>
  );
}
