#!/bin/sh
# Arranque del contenedor.
#
# Aplica las migraciones pendientes, deja el catálogo de materiales al día y
# recién ahí levanta el servidor. Si una migración falla, el contenedor no
# arranca: es preferible que la app no esté disponible a que atienda contra
# una base con la forma equivocada.
set -e

echo "→ Aplicando migraciones…"
prisma migrate deploy

# El catálogo de materiales de la planilla. Es idempotente: en cada arranque
# deja las columnas como corresponde sin duplicar nada.
#
# Que falle no justifica dejar la app abajo: el catálogo también se puede
# corregir después, y sin app no se puede hacer nada.
echo "→ Cargando el catálogo de materiales…"
node prisma/seed.js || echo "  (no se pudo cargar el catálogo; la app arranca igual)"

echo "→ Servidor en el puerto ${PORT:-3000}"
exec node server.js
