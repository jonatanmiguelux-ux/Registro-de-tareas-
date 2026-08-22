-- Nuevo rol para la persona del pañol. Va en su propia migración: Postgres
-- no deja usar un valor de enum recién agregado en la misma transacción.
ALTER TYPE "RolUsuario" ADD VALUE IF NOT EXISTS 'PANOLERO';
