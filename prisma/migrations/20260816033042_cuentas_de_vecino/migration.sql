-- CreateEnum
CREATE TYPE "TipoUsuario" AS ENUM ('VECINO', 'PERSONAL');

-- AlterTable
ALTER TABLE "reclamos_vecinales" ADD COLUMN     "vecinoId" TEXT;

-- CreateIndex
CREATE INDEX "reclamos_vecinales_vecinoId_creadoEn_idx" ON "reclamos_vecinales"("vecinoId", "creadoEn");

-- AddForeignKey
ALTER TABLE "reclamos_vecinales" ADD CONSTRAINT "reclamos_vecinales_vecinoId_fkey" FOREIGN KEY ("vecinoId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
