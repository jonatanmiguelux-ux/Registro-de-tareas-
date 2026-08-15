#!/bin/sh
# Copia diaria de la base, con borrado de las viejas.
#
# Corre en un bucle en vez de con cron para no sumar otra pieza al servidor:
# el contenedor no hace nada más y `restart: unless-stopped` se encarga de
# levantarlo si se cae.
set -e

RETENCION="${RETENCION_DIAS:-14}"

while true; do
  ARCHIVO="/copias/registro-tareas-$(date +%Y-%m-%d_%H%M).sql.gz"

  echo "[$(date '+%F %T')] copiando a ${ARCHIVO}"
  if pg_dump -h db -U registro -d registro_tareas | gzip > "${ARCHIVO}.parcial"; then
    # Se renombra al final: así una copia interrumpida nunca queda con
    # nombre de copia buena y no se confunde con una que sí sirve.
    mv "${ARCHIVO}.parcial" "${ARCHIVO}"
    echo "[$(date '+%F %T')] listo ($(du -h "${ARCHIVO}" | cut -f1))"
  else
    echo "[$(date '+%F %T')] FALLÓ la copia"
    rm -f "${ARCHIVO}.parcial"
  fi

  find /copias -name 'registro-tareas-*.sql.gz' -mtime "+${RETENCION}" -delete

  sleep 86400
done
