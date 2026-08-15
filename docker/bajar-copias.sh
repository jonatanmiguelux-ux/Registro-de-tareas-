#!/bin/sh
# Baja a esta máquina las copias de la base y las fotos que están en el
# servidor.
#
# Se corre **desde tu PC**, no desde el servidor: el sentido de todo esto es
# tener los datos en un lugar distinto del que puede romperse. Una copia que
# vive en el mismo disco que la base no es una copia de seguridad.
#
#   ./docker/bajar-copias.sh usuario@servidor [carpeta-destino]
#
# Ejemplo:
#   ./docker/bajar-copias.sh root@190.1.2.3 "/c/Users/Noxie-PC/Desktop/copias-planillas"
#
# Necesita rsync y una clave SSH ya configurada (ssh-copy-id), para que no
# pida contraseña y se pueda automatizar.
set -e

SERVIDOR="$1"
DESTINO="${2:-$HOME/copias-registro-tareas}"
RUTA_REMOTA="${RUTA_REMOTA:-~/Registro-de-tareas-}"

if [ -z "$SERVIDOR" ]; then
  echo "Uso: $0 usuario@servidor [carpeta-destino]" >&2
  exit 1
fi

mkdir -p "$DESTINO/base" "$DESTINO/fotos"

echo "→ Copias de la base"
# --ignore-existing: los volcados ya bajados no cambian nunca, así que no
# tiene sentido volver a transferirlos.
rsync -az --ignore-existing --info=progress2 \
  "$SERVIDOR:$RUTA_REMOTA/copias/" "$DESTINO/base/"

echo "→ Fotos originales"
# Las fotos viven en un volumen de Docker, no en el proyecto: se leen de donde
# Docker las guarda. Requiere ser root en el servidor.
rsync -az --ignore-existing --info=progress2 \
  "$SERVIDOR:/var/lib/docker/volumes/registro-de-tareas-_fotos/_data/" \
  "$DESTINO/fotos/" 2>/dev/null || \
  echo "  (no se pudieron bajar las fotos: revisá el nombre del volumen con 'docker volume ls')"

echo
echo "Listo. En $DESTINO:"
echo "  base:  $(ls -1 "$DESTINO/base" 2>/dev/null | wc -l) copias"
echo "  fotos: $(ls -1 "$DESTINO/fotos" 2>/dev/null | wc -l) archivos"
echo
echo "Para restaurar la base más reciente en un servidor nuevo:"
echo "  gunzip -c la-copia.sql.gz | docker compose -f docker-compose.prod.yml exec -T db psql -U registro -d registro_tareas"
