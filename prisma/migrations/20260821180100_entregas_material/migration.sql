-- Entregas del pañol a los móviles: descuentan del pañol central y acreditan
-- al stock del móvil.
CREATE TABLE "entregas_material" (
    "id" TEXT NOT NULL,
    "movil" INTEGER NOT NULL,
    "materialId" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nota" TEXT,
    "entregadaPorId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "entregas_material_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "entregas_material_movil_fecha_idx" ON "entregas_material"("movil", "fecha");
CREATE INDEX "entregas_material_materialId_idx" ON "entregas_material"("materialId");
ALTER TABLE "entregas_material" ADD CONSTRAINT "entregas_material_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materiales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "entregas_material" ADD CONSTRAINT "entregas_material_entregadaPorId_fkey" FOREIGN KEY ("entregadaPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
