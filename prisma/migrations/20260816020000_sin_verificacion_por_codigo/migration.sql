-- AlterEnum
BEGIN;
CREATE TYPE "EstadoReclamoVecinal_new" AS ENUM ('RECIBIDO', 'DERIVADO', 'DESCARTADO');
ALTER TABLE "public"."reclamos_vecinales" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "reclamos_vecinales" ALTER COLUMN "estado" TYPE "EstadoReclamoVecinal_new" USING ("estado"::text::"EstadoReclamoVecinal_new");
ALTER TYPE "EstadoReclamoVecinal" RENAME TO "EstadoReclamoVecinal_old";
ALTER TYPE "EstadoReclamoVecinal_new" RENAME TO "EstadoReclamoVecinal";
DROP TYPE "public"."EstadoReclamoVecinal_old";
ALTER TABLE "reclamos_vecinales" ALTER COLUMN "estado" SET DEFAULT 'RECIBIDO';
COMMIT;

-- AlterTable
ALTER TABLE "reclamos_vecinales" DROP COLUMN "verificacionExpira",
DROP COLUMN "verificacionHash",
DROP COLUMN "verificacionIntentos",
DROP COLUMN "verificadoEn",
ALTER COLUMN "contacto" DROP NOT NULL,
ALTER COLUMN "estado" SET DEFAULT 'RECIBIDO';

