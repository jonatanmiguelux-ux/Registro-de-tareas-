-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "EstadoPlanilla" AS ENUM ('PROCESANDO', 'EN_REVISION', 'CONFIRMADA', 'ERROR');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('ENTRADA', 'SALIDA');

-- CreateTable
CREATE TABLE "planillas" (
    "id" TEXT NOT NULL,
    "estado" "EstadoPlanilla" NOT NULL DEFAULT 'PROCESANDO',
    "archivoNombre" TEXT NOT NULL,
    "archivoTipo" TEXT NOT NULL,
    "archivoRuta" TEXT NOT NULL,
    "fecha" TIMESTAMP(3),
    "oficial" TEXT,
    "chofer" TEXT,
    "movil" TEXT,
    "localidad" TEXT,
    "modelo" TEXT,
    "respuestaCruda" JSONB,
    "notasIa" TEXT,
    "error" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "confirmadoEn" TIMESTAMP(3),

    CONSTRAINT "planillas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reclamos" (
    "id" TEXT NOT NULL,
    "planillaId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3),
    "oficial" TEXT,
    "chofer" TEXT,
    "movil" TEXT,
    "localidad" TEXT,
    "tipoReclamo" TEXT,
    "fechaIngreso" TIMESTAMP(3),
    "nroIncidente" TEXT,
    "calle" TEXT,
    "numero" TEXT,
    "observaciones" TEXT,
    "diagnostico" TEXT,
    "confianza" TEXT,
    "revisado" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reclamos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materiales" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "grupo" TEXT,
    "unidad" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "columnaImpresa" BOOLEAN NOT NULL DEFAULT true,
    "stockInicial" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "materiales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reclamo_materiales" (
    "id" TEXT NOT NULL,
    "reclamoId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "reclamo_materiales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_stock" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nota" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_stock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "planillas_creadoEn_idx" ON "planillas"("creadoEn");

-- CreateIndex
CREATE INDEX "planillas_estado_idx" ON "planillas"("estado");

-- CreateIndex
CREATE INDEX "reclamos_planillaId_orden_idx" ON "reclamos"("planillaId", "orden");

-- CreateIndex
CREATE INDEX "reclamos_fecha_idx" ON "reclamos"("fecha");

-- CreateIndex
CREATE INDEX "reclamos_nroIncidente_idx" ON "reclamos"("nroIncidente");

-- CreateIndex
CREATE UNIQUE INDEX "materiales_nombre_key" ON "materiales"("nombre");

-- CreateIndex
CREATE INDEX "materiales_orden_idx" ON "materiales"("orden");

-- CreateIndex
CREATE INDEX "materiales_grupo_idx" ON "materiales"("grupo");

-- CreateIndex
CREATE INDEX "reclamo_materiales_materialId_idx" ON "reclamo_materiales"("materialId");

-- CreateIndex
CREATE UNIQUE INDEX "reclamo_materiales_reclamoId_materialId_key" ON "reclamo_materiales"("reclamoId", "materialId");

-- CreateIndex
CREATE INDEX "movimientos_stock_materialId_fecha_idx" ON "movimientos_stock"("materialId", "fecha");

-- CreateIndex
CREATE INDEX "movimientos_stock_tipo_idx" ON "movimientos_stock"("tipo");

-- AddForeignKey
ALTER TABLE "reclamos" ADD CONSTRAINT "reclamos_planillaId_fkey" FOREIGN KEY ("planillaId") REFERENCES "planillas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reclamo_materiales" ADD CONSTRAINT "reclamo_materiales_reclamoId_fkey" FOREIGN KEY ("reclamoId") REFERENCES "reclamos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reclamo_materiales" ADD CONSTRAINT "reclamo_materiales_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materiales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_stock" ADD CONSTRAINT "movimientos_stock_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materiales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

