-- CreateTable
CREATE TABLE "cuadrillas" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "localidades" TEXT[],
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cuadrillas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cuadrillas_numero_key" ON "cuadrillas"("numero");
