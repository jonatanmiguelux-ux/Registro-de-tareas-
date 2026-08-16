-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "tipo" "TipoUsuario" NOT NULL DEFAULT 'PERSONAL';

-- CreateIndex
CREATE INDEX "usuarios_tipo_estado_idx" ON "usuarios"("tipo", "estado");
