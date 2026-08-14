import { CargarPlanilla } from "@/components/CargarPlanilla";

export default function Inicio() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Cargar una planilla
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Sacá una foto de la planilla completa, con los cuatro bordes a la
          vista y sin sombras encima de la tabla. La IA la lee y después vas a
          poder corregir todo antes de guardar.
        </p>
      </div>

      <CargarPlanilla />
    </div>
  );
}
