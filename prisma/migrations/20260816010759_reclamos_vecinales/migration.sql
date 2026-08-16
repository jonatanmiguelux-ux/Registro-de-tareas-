-- CreateEnum
CREATE TYPE "TipoFalla" AS ENUM ('NO_FUNCIONA', 'ENCENDIDA', 'INTERMITENTE');

-- CreateEnum
CREATE TYPE "EstadoReclamoVecinal" AS ENUM ('SIN_VERIFICAR', 'RECIBIDO', 'DERIVADO', 'DESCARTADO');

-- CreateTable
CREATE TABLE "reclamos_vecinales" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipo" "TipoFalla" NOT NULL,
    "localidad" TEXT NOT NULL,
    "calle" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "observacion" TEXT NOT NULL,
    "fotoRuta" TEXT NOT NULL,
    "contacto" TEXT NOT NULL,
    "estado" "EstadoReclamoVecinal" NOT NULL DEFAULT 'SIN_VERIFICAR',
    "verificacionHash" TEXT,
    "verificacionExpira" TIMESTAMP(3),
    "verificacionIntentos" INTEGER NOT NULL DEFAULT 0,
    "verificadoEn" TIMESTAMP(3),
    "nroIncidente" TEXT,
    "derivadoEn" TIMESTAMP(3),
    "derivadoPor" TEXT,
    "notaInterna" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reclamos_vecinales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reclamos_vecinales_codigo_key" ON "reclamos_vecinales"("codigo");

-- CreateIndex
CREATE INDEX "reclamos_vecinales_estado_creadoEn_idx" ON "reclamos_vecinales"("estado", "creadoEn");

-- CreateIndex
CREATE INDEX "reclamos_vecinales_localidad_calle_idx" ON "reclamos_vecinales"("localidad", "calle");
