-- Código de acceso por cuadrilla, para el celular del equipo.
ALTER TABLE "cuadrillas" ADD COLUMN "tokenAcceso" TEXT;

-- Único: dos cuadrillas no pueden compartir el mismo código.
CREATE UNIQUE INDEX "cuadrillas_tokenAcceso_key" ON "cuadrillas"("tokenAcceso");
