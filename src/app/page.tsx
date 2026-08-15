import { CargarPlanilla } from "@/components/CargarPlanilla";
import { PlanillasSinRevisar } from "@/components/PlanillasSinRevisar";

/**
 * Pantalla de cargar.
 *
 * Se deja **estática** a propósito: es la única que el service worker guarda
 * para abrir sin señal, porque es donde se saca la foto que queda en cola
 * esperando conexión. Todo lo que necesite datos del servidor va en un
 * componente cliente (ver PlanillasSinRevisar), no acá.
 */
export default function Inicio() {
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
