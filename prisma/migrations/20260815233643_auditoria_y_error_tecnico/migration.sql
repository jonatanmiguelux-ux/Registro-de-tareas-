-- AlterTable
ALTER TABLE "planillas" ADD COLUMN     "cargadaPorId" TEXT,
ADD COLUMN     "confirmadaPorId" TEXT,
ADD COLUMN     "errorTecnico" TEXT;

-- CreateIndex
CREATE INDEX "planillas_cargadaPorId_idx" ON "planillas"("cargadaPorId");

-- AddForeignKey
ALTER TABLE "planillas" ADD CONSTRAINT "planillas_cargadaPorId_fkey" FOREIGN KEY ("cargadaPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planillas" ADD CONSTRAINT "planillas_confirmadaPorId_fkey" FOREIGN KEY ("confirmadaPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
