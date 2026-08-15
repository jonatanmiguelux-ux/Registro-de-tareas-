# Imagen de producción de Registro de tareas.
#
# Cuatro etapas. La que sirve la app no lleva ni el compilador ni el código
# fuente ni la CLI de Prisma: las migraciones corren en un contenedor aparte,
# de un solo uso (ver el servicio `migraciones` en docker-compose.prod.yml).
#
# Se hace así porque la CLI de Prisma arrastra un árbol de dependencias propio
# que no se puede recortar a mano sin que se rompa; darle su propio contenedor
# sale más barato que cargarlo en la imagen que queda corriendo siempre.

# ---------------------------------------------------------------- dependencias
FROM node:22-alpine AS dependencias
# Prisma necesita OpenSSL para hablar con Postgres.
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ------------------------------------------------------------------ compilación
FROM node:22-alpine AS compilacion
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=dependencias /app/node_modules ./node_modules
COPY . .

# `next build` corre `prisma generate` antes (ver el script en package.json).
# No necesita una base viva: sólo lee el esquema.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ------------------------------------------------------------------ migraciones
# Contenedor de un solo uso: aplica las migraciones y carga el catálogo de
# materiales. Tiene el node_modules entero, así que la CLI de Prisma y tsx
# funcionan sin recortes.
FROM compilacion AS migraciones
CMD ["sh", "-c", "npx prisma migrate deploy && npm run db:seed"]

# ---------------------------------------------------------------------- servir
FROM node:22-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Las fotos originales van a un volumen, no al sistema de archivos de la
# imagen: si no, se perderían en cada actualización.
ENV UPLOAD_DIR=/datos/uploads

# Usuario sin privilegios: si alguien logra ejecutar algo dentro del
# contenedor, que no sea root.
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=compilacion /app/public ./public
COPY --from=compilacion --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=compilacion --chown=nextjs:nodejs /app/.next/static ./.next/static

RUN mkdir -p /datos/uploads && chown -R nextjs:nodejs /datos

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
