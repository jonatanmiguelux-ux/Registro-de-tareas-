-- AlterTable
ALTER TABLE "reclamos_vecinales" ADD COLUMN     "cuadrilla" INTEGER;

-- CreateIndex
CREATE INDEX "reclamos_vecinales_cuadrilla_estado_idx" ON "reclamos_vecinales"("cuadrilla", "estado");
