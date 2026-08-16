# Imagen de producción de Registro de tareas.
#
# Una sola imagen que sabe migrar la base, cargar el catálogo de materiales y
# servir la app. Se hace así porque los servicios de despliegue que no piden
# consola —Render, Railway y parecidos— corren **un solo contenedor**: no hay
# lugar donde poner un paso previo separado.
#
# El costo es que la CLI de Prisma viaja en la imagen. Se instala aparte, con
# `npm install -g`, y no copiando carpetas sueltas de node_modules: esa CLI
# arrastra su propio árbol de dependencias, y recortarlo a mano se rompe de
# formas que sólo aparecen al arrancar en producción.

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

# El seed es TypeScript y en la imagen final no hay tsx: se transpila acá,
# que es donde todavía están las herramientas de compilación.
RUN npx tsc prisma/seed.ts \
      --outDir ./prisma-compilado \
      --module commonjs --target es2022 --moduleResolution node \
      --esModuleInterop --skipLibCheck

# ---------------------------------------------------------------------- servir
FROM node:22-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Las fotos originales van a un volumen o disco, no al sistema de archivos de
# la imagen: si no, se perderían en cada actualización.
ENV UPLOAD_DIR=/datos/uploads

# La CLI, para poder aplicar migraciones al arrancar. La versión se fija a
# propósito: que coincida con la del proyecto evita sorpresas el día que
# Prisma saque una versión nueva.
RUN npm install -g prisma@6.19.3 && npm cache clean --force

# Usuario sin privilegios: si alguien logra ejecutar algo dentro del
# contenedor, que no sea root.
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=compilacion /app/public ./public
COPY --from=compilacion --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=compilacion --chown=nextjs:nodejs /app/.next/static ./.next/static

# El esquema y las migraciones, para que `prisma migrate deploy` sepa qué
# aplicar; y el seed ya transpilado.
COPY --from=compilacion /app/prisma ./prisma
COPY --from=compilacion /app/prisma-compilado/seed.js ./prisma/seed.js

COPY --chmod=755 docker/arrancar.sh ./arrancar.sh

RUN mkdir -p /datos/uploads && chown -R nextjs:nodejs /datos

USER nextjs
EXPOSE 3000

CMD ["./arrancar.sh"]
