# Registro de tareas

App web que digitaliza planillas de mantenimiento manuscritas: se saca una foto
desde el celular, una IA la lee, una persona corrige lo que haga falta y los
datos quedan guardados y exportables a Excel.

Funciona igual en celular y en PC.

## Qué hace

1. **Cargar** — foto desde la cámara del celular, o una imagen desde la PC.
2. **Leer** — Gemini (visión) transcribe la planilla: los datos de cada fila y
   las X de cada columna de materiales, asociadas a su fila y su columna.
3. **Revisar** — se muestra todo lo detectado en campos editables, junto a la
   foto original. Las filas que la IA leyó con dudas quedan resaltadas, y las
   que parecen ya estar cargadas se avisan antes de guardar.

   La confianza que declara la IA tiene dos niveles: *"Revisar los números"*
   cuando algún carácter podía ser otro —el caso típico son los ocho dígitos
   del N.º de incidente— y *"Lectura dudosa"* cuando no pudo leer parte de la
   fila o no está segura de a qué columna va una marca.
4. **Guardar** — cada carga es un registro nuevo. Nunca se pisan datos de otro
   día: el histórico se acumula.
5. **Consultar** — historial por fecha, búsqueda por N.º de incidente y
   filtros por fecha, cuadrilla y estado.
6. **Medir** — tablero con totales, pendientes, resumen diario y consumo por
   tipo de material.
7. **Controlar stock** — inicial, entradas, salidas y stock actual.
8. **Exportar** — `.xlsx` de un día o de un período, con los mismos filtros
   que la pantalla.

## Los reclamos de los vecinos

Hoy, para reportar una luz quemada, un vecino tiene que ir hasta la
delegación. La app suma una pantalla pública —**`/reclamar`**— donde lo carga
desde el celular en un minuto.

**No genera números de incidente propios**, a propósito. El municipio ya tiene
un sistema que los emite, y dos numeraciones conviviendo terminarían en que la
cuadrilla recibe papeles que no cierran con el sistema. Esto es una puerta de
entrada, no un reemplazo:

1. El vecino carga tipo de falla, localidad, calle, altura, una foto y una
   descripción. Todo obligatorio; el correo es opcional, sólo para poder
   avisarle cómo sigue.
2. Aparece en **Vecinos**, la bandeja del municipio.
3. Alguien lo carga en el sistema oficial y anota acá el N.º de incidente que
   ese sistema devuelve.
4. El vecino ve el estado con su número de seguimiento, sin cuenta ni
   contraseña.

Las tres fallas que puede reportar son **no funciona**, **encendida de día** e
**intermitente**.

### A qué cuadrilla le toca

El reclamo se deriva solo según la localidad. Nadie tiene que mirar un mapa ni
acordarse de quién cubre qué:

| Cuadrilla | Zona | Localidades |
|---|---|---|
| **1** | Nueva Atlantis y Mar de Ajó | Nueva Atlantis · Mar de Ajó |
| **2** | De Costa Azul a Mar del Tuyú | Costa Azul · La Lucila · Aguas Verdes · Costa del Este · Mar del Tuyú |
| **3** | Santa Teresita y Costa Chica | Santa Teresita · Costa Chica |
| **4** | De Las Toninas a San Clemente | Las Toninas · San Clemente |

El número de cuadrilla es el mismo que el **Móvil N.º** de la planilla de
papel, así el reclamo del vecino y el trabajo que después aparece en la
planilla se pueden cruzar.

Las zonas son **tramos contiguos** sobre el orden en que el municipio nombra
las localidades, que resulta ser el recorrido de la costa: por eso se
describen como "de tal a tal" y no como listas sueltas. Hay un test que lo
verifica, para que nadie reordene esa lista sin darse cuenta de que las zonas
dependen de ella.

Una localidad que no esté en ninguna zona —un lugar fuera del partido, o uno
nuevo sin repartir— **no se deriva a nadie**: queda aparte y a la vista en la
pantalla de Vecinos. Adivinar mandaría un equipo a un lugar que no le toca.

El reparto se cambia en `src/lib/cuadrillas.ts`, y se ve dentro de la app en
Vecinos → "Zonas de trabajo".

Esta parte está aislada del resto: tabla propia, sin tocar planillas, stock ni
reclamos de cuadrilla. Es lo único de la app abierto a internet, así que todo
se valida en el servidor —lo del navegador es una comodidad, no una defensa—,
la foto se verifica por su contenido y hay tope por hora y por conexión.

La **foto del vecino y la edición del reclamo exigen sesión**, aunque estén
bajo la misma carpeta de rutas que la parte pública: sin ese control, cualquiera
con un código de seguimiento podría mirar fotos de casas ajenas.

**No hay verificación de identidad**: cualquiera con el enlace puede cargar un
reclamo, y lo único que frena la carga masiva es el tope por hora y por
conexión. Es una decisión, no un olvido: pedir un código de confirmación
dejaba afuera a quien no tiene correo o no quiere darlo, que es justamente la
gente que hoy tiene que ir hasta la delegación. Si aparece abuso real, el paso
de verificación se puede reponer.

## Las pantallas

| Pantalla | Para qué |
|---|---|
| **Cargar** | Sacar la foto y mandarla a analizar |
| **Registros** | Historial agrupado por día, búsqueda por incidente y filtros |
| **Tablero** | Totales, pendientes, resumen diario y consumo por material |
| **Stock** | Stock inicial, entradas, salidas y stock actual |
| **Vecinos** | Los reclamos que cargó la gente, para pasarlos al sistema oficial |
| **Reclamar** | Pública, sin cuenta: donde el vecino carga su reclamo |

Los filtros (fecha, cuadrilla, estado, incidente) viven en la query string: se
comparten con un link, sobreviven al refresh y son exactamente lo que exporta
el botón de Excel. Registros y Tablero usan la misma capa de filtros, así lo
que se descarga siempre coincide con lo que se está viendo.

## La planilla

Está modelada sobre la planilla de **alumbrado público** del municipio.

**Cabecera** (se llena una sola vez y vale para toda la hoja): Fecha, Oficial,
Chofer y Móvil N.º. El sistema la baja automáticamente a cada fila, así cada
reclamo queda completo y se puede exportar solo.

**Columnas de cada fila:** Localidad · Tipo de reclamo · Fecha Ingreso ·
N.º Incidente · Dirección — esta última llega en una sola celda y el sistema
la separa en calle y altura.

**La localidad se escribe con sigla.** El sistema la expande al guardar, así
el historial y el Excel salen legibles:

| | | | |
|---|---|---|---|
| NA — Nueva Atlantis | MdA — Mar de Ajó | CA — Costa Azul | LL — La Lucila |
| AV — Aguas Verdes | CE — Costa del Este | MdT — Mar del Tuyú | ST — Santa Teresita |
| CCh — Costa Chica | LT — Las Toninas | SC — San Clemente | |

**Materiales**, en tres grupos, con los encabezados impresos en vertical:

| Grupo | Columnas |
|---|---|
| Lámparas | LED E27, LED E40, Sodio 100, Sodio 150, Sodio 250, Sodio 400, H/Q 250, H/Q 400 |
| Balastos | B 100 int, B 150 int, B 150 ext, B 250 int, B 400 int |
| Otros materiales | Fotocontrol, Zócalo ext, Edison, Goliat, Morteto, Ignitor |

En el papel el tercer grupo está impreso como "Otras materiales". El grupo es
taxonomía nuestra y no un dato de la planilla, así que en el código va en
singular correcto; el lector de planillas descarta las dos formas por igual.

Cada celda marcada cuenta 1; si en vez de una X hay un número escrito, se toma
ese número como cantidad.

### Qué más aparece escrito en la zona de materiales

No todo lo que se escribe ahí es una marca de material. Hay cuatro cosas
distintas y cada una termina en un lugar distinto:

| Lo que hay en el papel | Adónde va |
|---|---|
| Una X, cruz o número en un casillero | Marca de material, con su cantidad |
| **AD** al lado de una lámpara | Material **Adaptador**. No tiene columna impresa: se anota a mano |
| **C/C**, **F/C**, **F/N** | Campo **Diagnóstico**: Cable Cortado, Falso Contacto, Funciona Normal |
| Una frase que cruza varias columnas ("Imposible acceso") | Campo **Observaciones** |

El diagnóstico y las observaciones **no consumen stock**: dicen qué se
encontró, no qué se gastó. Meterlos como material descontaría material que
nunca salió del depósito.

## El catálogo de materiales

Las 19 columnas vienen precargadas en `prisma/seed.ts` (`npm run db:seed`).
Precargarlas fija la nomenclatura desde la primera planilla y evita que dos
fotos generen dos variantes del mismo material.

Pero **no están cableadas en el código**: si mañana el municipio agrega una
columna a la planilla, la IA la lee y se da de alta sola en el catálogo, con
su grupo. La lista precargada se le pasa al modelo como referencia y como
orden esperado de las columnas —que es lo que más ayuda a no correrse al
asociar una marca—, no como límite. También se puede dar de alta una columna
a mano con `POST /api/materiales`.

El catálogo tiene además un material sin columna impresa, el **Adaptador**,
marcado con `columnaImpresa: false`. Consume stock como cualquier otro, pero
queda fuera de la lista ordenada que se le pasa al modelo: esa lista sirve
para contar casilleros, y un nombre de más ahí corre todas las marcas
siguientes.

## Puesta en marcha

Requiere Node 20+ y Docker (o un PostgreSQL propio).

```bash
# 1. Base de datos (queda en el puerto 5433 del host, para no chocar
#    con cualquier otro PostgreSQL que ya tengas en el 5432)
docker compose up -d

# 2. Configuración
cp .env.example .env
#    editá .env y poné tu GEMINI_API_KEY (https://aistudio.google.com/apikey)

# 3. Dependencias y esquema
npm install
npm run db:deploy   # aplica las migraciones
npm run db:seed     # carga el catálogo de materiales

# 4. A andar
npm run dev
```

Abrí http://localhost:3000

Para cambiar el esquema en desarrollo, `npm run db:migrate` (genera la
migración y la aplica). `db:push` sigue estando pero sólo para probar una idea:
no deja rastro y puede perder datos.

## Ponerlo en producción

Un VPS chico alcanza sobrado. Todo va con Docker Compose: la app, Postgres,
Caddy —que saca y renueva el certificado HTTPS solo— y las copias de la base.

El dominio del proyecto es **registros-de-tareas.com.ar**.

```bash
# En el servidor, con el repo clonado:
cp .env.production.example .env.production
#    completá claves y contraseñas

docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Antes de levantar, el dominio tiene que estar apuntando a la IP del servidor
con un registro A: Caddy pide el certificado la primera vez que alguien entra,
y si el DNS todavía no propagó, falla.

**Cómo está armado.** Las migraciones corren en un contenedor aparte que se
ejecuta una vez y termina; la app no arranca hasta que ese contenedor haya
salido bien, así nunca atiende contra una base con la forma equivocada. Las
fotos originales viven en un volumen, no en la imagen, para que sobrevivan a
cada actualización. Y la base se copia una vez por día a `./copias/`, que es lo
único que hay entre un disco roto y perder todo el histórico.

**Por qué no serverless.** Vercel y parecidos no sirven acá por dos motivos
concretos: el disco es efímero y las fotos se perderían —quedarían planillas
apuntando a archivos que ya no existen, y se pierde poder auditar contra el
papel—, y la lectura de una planilla tarda entre 20 y 40 segundos, arriba del
tope de esos planes.

**El acceso.** Cada persona entra con su cuenta de Google (ver "Quién entra y
qué puede hacer"). Hace falta crear credenciales de OAuth en
[console.cloud.google.com](https://console.cloud.google.com) → APIs y
servicios → Credenciales → ID de cliente de OAuth → Aplicación web.

Orígenes autorizados de JavaScript:

```
https://registros-de-tareas.com.ar
http://localhost:3000
```

URI de redireccionamiento autorizados, **exactos** y sin barra al final:

```
https://registros-de-tareas.com.ar/api/auth/callback/google
http://localhost:3000/api/auth/callback/google
```

Si no coinciden carácter por carácter, Google rechaza el login con
`redirect_uri_mismatch`. Es el error más común al desplegar, y el mensaje no
aclara cuál es la diferencia.

En la consola de Google esas dos claves se llaman "ID de cliente" y "Secreto
del cliente"; en el `.env` van como `AUTH_GOOGLE_ID` y `AUTH_GOOGLE_SECRET`,
que son los nombres que espera Auth.js. Si las cargás con el nombre que usa
Google, la app no las encuentra y el botón de entrar no hace nada.

Y en la pantalla de consentimiento hay que **publicar la aplicación**: en modo
"Prueba" sólo entran los correos cargados a mano en la lista de usuarios de
prueba, y las sesiones se caen cada 7 días. Como no se piden permisos
sensibles —sólo nombre, correo y foto—, publicarla es instantáneo y no pasa
por ninguna revisión de Google.

**Las copias.** El servidor guarda una por día en `./copias/`, pero eso no
salva de que se rompa el servidor entero. Para bajarlas a tu PC:

```bash
./docker/bajar-copias.sh root@la-ip-del-servidor "/ruta/donde/guardarlas"
```

Baja los volcados de la base y las fotos originales, saltea lo que ya tenés y
te dice cómo restaurar. Necesita `rsync` y una clave SSH configurada. Conviene
dejarlo en el programador de tareas de Windows una vez por semana.

Para actualizar: `git pull` y repetir el `up -d --build`.

## Desde el celular

La app se instala en el celular como una app más: ícono propio en la pantalla
de inicio, sin barra de direcciones. No se publica en ninguna tienda ni hay
que registrarse — es la misma app conectada al mismo servidor.

```bash
npm run dev:celular
```

Levanta con HTTPS y escuchando en toda la red. Entrá desde el celular a
`https://<ip-de-tu-pc>:3000` y aceptá el aviso de certificado (es
autofirmado, generado por Next la primera vez). Después:

- **Android/Chrome** — menú ⋮ → "Instalar aplicación"
- **iPhone/Safari** — Compartir → "Agregar a inicio"

**El HTTPS no es opcional**: los navegadores sólo habilitan la cámara en
`localhost` o sobre HTTPS. Por HTTP plano vas a poder elegir una foto de la
galería, pero el botón de sacar la foto no abre la cámara.

### Sin señal

Si no hay conexión, la foto **no se pierde**: queda guardada en el celular y
se sube sola cuando vuelve la señal. Quien está en la calle saca la foto,
recibe el aviso de que quedó guardada y sigue con el próximo poste.

La app avisa cuántas hay esperando y las sube en el orden en que se sacaron.
Reintenta cuando vuelve la red, cuando se vuelve a la app y cada 30 segundos,
porque el evento de "volvió la conexión" no siempre llega si la señal se
recupera sin cambiar de red.

Hay un detalle que importa para no cargar nada dos veces: **una foto sale de
la cola cuando el servidor responde, no cuando responde que salió bien.**
`POST /api/planillas` crea la planilla *antes* de mandar la foto al modelo,
así que un error de lectura igual deja la planilla guardada (en estado
ERROR). Reintentar eso crearía una segunda planilla para la misma foto y el
consumo de materiales se contaría doble. Sólo se conserva lo que nunca llegó
al servidor. Está cubierto por tests: `npm test`.

Dos límites conocidos: la app tiene que estar abierta en el navegador para
que la subida ocurra —subir con la app cerrada necesita Background Sync, que
Android soporta pero iOS no—, y sin señal sólo abre la pantalla de cargar;
el historial, el tablero y el stock necesitan conexión, porque mostrar una
copia guardada sería mentir sobre el estado real.

## Formatos de foto

JPG, PNG, WEBP y HEIC, hasta 20 MB. Las fotos de iPhone en HEIC entran
directo, sin tener que tocar el formato de cámara.

La planilla es apaisada y se fotografía con el celular en vertical, así que es
normal que la hoja salga de costado. No hace falta rotarla antes de subirla:
el modelo ubica la orientación.

## Estructura

```
prisma/schema.prisma        Modelo de datos
src/lib/ocr.ts              Lectura de la planilla con Gemini
src/lib/schema.ts           Forma de la respuesta de la IA (zod)
src/lib/gemini-schema.ts    Traducción de ese zod al esquema que acepta Gemini
src/lib/localidades.ts      Siglas de localidad → nombre completo
src/lib/cuadrillas.ts       Zonas: qué cuadrilla atiende cada localidad
src/lib/diagnosticos.ts     Siglas C/C, F/C, F/N → diagnóstico
src/lib/excel.ts            Armado del .xlsx
src/lib/materiales.ts       Catálogo de columnas, con alta automática
src/lib/cola.ts             Cola de fotos sin señal (IndexedDB)
src/components/graficos.tsx Barras y columnas del tablero, en HTML y CSS
src/app/globals.css         Sistema de diseño: colores, tipografía, controles
src/app/manifest.ts         Manifiesto de la PWA (instalación en el celular)
public/sw.js                Service worker: sólo cachea estáticos, nunca datos
Dockerfile                  Imagen de producción
docker-compose.prod.yml     Despliegue: app, base, Caddy y copias
docker/Caddyfile            HTTPS automático y contraseña de acceso
src/app/page.tsx            Cargar
src/app/revisar/[id]/       Revisar y corregir
src/app/registros/          Histórico y exportación
src/app/api/                Endpoints
```

## API

| Método | Ruta | Para qué |
|---|---|---|
| `POST` | `/api/planillas` | Sube la foto, la analiza y crea el borrador |
| `GET` | `/api/planillas` | Lista el histórico |
| `GET` | `/api/planillas/:id` | Una planilla con sus reclamos |
| `PATCH` | `/api/planillas/:id` | Guarda las correcciones (`confirmar: true` la cierra) |
| `DELETE` | `/api/planillas/:id` | Descarta una carga |
| `GET` | `/api/planillas/:id/imagen` | La foto original |
| `GET` | `/api/planillas/:id/duplicados` | Posibles cargas repetidas |
| `GET` | `/api/materiales` | Catálogo de materiales |
| `POST` | `/api/materiales` | Alta manual de una columna |
| `GET` | `/api/stock` | Stock actual por material |
| `POST` | `/api/stock` | Registra una entrada o salida |
| `PATCH` | `/api/stock` | Fija el stock inicial de un material |
| `DELETE` | `/api/stock` | Deshace un movimiento |
| `GET` | `/api/export` | Descarga el `.xlsx` |

`/api/export` y las pantallas aceptan los mismos filtros: `desde`, `hasta`
(AAAA-MM-DD), `cuadrilla`, `estado` y `incidente`. La exportación además
mantiene `planillaId` y `soloConfirmadas=1` por compatibilidad.

## El Excel

- **Hoja "Reclamos"** — una fila por reclamo, con una columna por material.
  Es la vista parecida al papel.
- **Hoja "Materiales"** — una fila por cada material usado en cada reclamo.
  Es la vista larga, la que sirve para tablas dinámicas.
- **Hoja "Consumo"** — el total por tipo de material del período, ya sumado,
  con su renglón de TOTAL.
- **Hoja "Por localidad"** — una fila por localidad: cuántos reclamos, cuántos
  llevaron material, cuánto se gastó y en cuántos días. Responde "¿dónde se
  está yendo el material?" sin armar una tabla dinámica.

Las cuatro salen con autofiltro y encabezado fijo. Para exportar un solo día,
`desde` y `hasta` con la misma fecha (el botón "Excel del día" del resumen
diario ya lo hace).

### Todo sale agrupado por localidad

Las filas se ordenan **por localidad** y, dentro de cada una, por fecha.
Da igual cómo estuviera escrita en el papel: al cargar, la sigla se convierte
al nombre completo, así que `ST`, `St` y `Santa Teresita` caen las tres en el
mismo grupo.

El orden de las localidades es el que usa el municipio (el de la lista de más
arriba), no el alfabético: así el Excel sale con el mismo recorrido con el que
se piensa el partido. Se cambia reordenando una sola lista en
`src/lib/localidades.ts`.

Las localidades que no están en esa lista se respetan y van después de las
conocidas; las filas sin localidad quedan al final de todo, que es donde se
ven de una para completarlas a mano.

Dentro de cada localidad el desempate final es el N.º de incidente y no el
orden del papel, para que exportar dos veces el mismo período dé el mismo
archivo.

## Cómo se define cada cosa

Tres decisiones que conviene tener presentes al leer los números:

- **Cuadrilla = Móvil N.º.** No hay una entidad "cuadrilla" aparte: el móvil
  ya viene en cada reclamo, heredado de la cabecera, y es lo que identifica al
  equipo que salió.
- **Reclamo pendiente = está en una planilla sin confirmar.** No se le agregó
  un estado propio al reclamo; se usa el ciclo de revisión que ya existía.
- **Duplicado = aviso, nunca bloqueo.** Se marca por N.º de incidente repetido
  (señal fuerte) o por misma fecha, localidad y dirección (más débil: una
  cuadrilla puede volver al mismo poste el mismo día). Quien tiene el papel
  adelante decide.

## El stock

    stock actual = inicial + entradas − salidas − consumo

- **Inicial** es el punto de partida: se corrige, no se acumula.
- **Entradas y salidas** son movimientos de depósito cargados a mano. Las
  salidas son para lo que **no** pasa por una planilla: una rotura, un
  traspaso, un faltante de inventario.
- **Consumo** sale solo de los reclamos, y **sólo cuenta cuando la planilla
  está confirmada**. Mientras está en revisión los números todavía pueden
  cambiar, y descontarlos antes haría bailar el stock con cada corrección.

Por eso los materiales gastados en un reclamo **no** se cargan además como
salida: se restarían dos veces.

## La interfaz

Dos criterios mandan sobre el gusto, porque esta app se usa parada en la calle
con el celular en una mano y la planilla de papel en la otra:

- **Contraste alto.** Se lee al sol. Los grises tibios que se estilan
  desaparecen con luz directa, así que el texto secundario acá es más oscuro
  de lo que se usa.
- **Blancos que se puedan tocar.** Ningún control baja de 44 píxeles de alto,
  que es lo que mide un dedo. En el celular la navegación va abajo, donde
  llega el pulgar de la mano que sostiene el teléfono.

Es sólo en claro, a propósito: se usa de día, a la intemperie, y un modo
oscuro a medio hacer se ve peor que no tenerlo.

Los colores de los gráficos del tablero no se eligieron a ojo. Son tres, uno
por grupo de material, y están verificados para que se distingan entre sí
también con daltonismo. Aun así, ninguna barra depende sólo del color: todas
llevan su nombre y su número escritos al lado.

## Criterios de diseño

- **Ante la duda, hueco antes que invento.** Un campo que la IA no lee queda
  vacío para que lo complete una persona; nunca se rellena con un valor
  plausible.
- **La revisión humana es parte del flujo, no un extra.** Nada se da por bueno
  hasta que alguien confirma la planilla, y queda registrado qué filas revisó
  una persona (`revisado`) y con qué confianza las había leído la IA.
- **Nada se sobrescribe.** Cada foto es una planilla nueva. Borrar es una
  acción explícita.
- **Se guarda la respuesta cruda de la IA** (`respuestaCruda`) junto con la
  foto original, para poder auditar cualquier dato contra el papel.

## Quién entra y qué puede hacer

Se entra con **cuenta de Google**. No hay contraseñas que recordar ni que
repartir: la identidad la pone Google.

Pero iniciar sesión con Google dice *quién sos*, no si tenés permiso —si no,
cualquiera con un Gmail entraría a los partes del municipio—. Por eso la
cuenta nace **en espera** y no ve nada hasta que un administrador la habilita
desde la pantalla de Cuentas. **La primera cuenta que entra al sistema queda
como administradora**, porque si no no habría nadie que pudiera aprobar a
nadie y la app arrancaría trabada.

| | Operario | Administrador |
|---|---|---|
| Cargar, revisar y confirmar planillas | Sí | Sí |
| Ver historial, tablero, stock y exportar | Sí | Sí |
| Cargar entradas y salidas de depósito | Sí | Sí |
| Borrar planillas | — | Sí |
| Corregir el stock inicial | — | Sí |
| Habilitar cuentas y cambiar roles | — | Sí |

Dar de baja una cuenta **no la borra**: se le retira el acceso y queda el
registro de que existió, junto con quién la habilitó y cuándo.

### Cómo está hecho

El portón está en dos capas, y la separación importa:

- **El middleware** sólo comprueba que *haya* sesión. Corre en el borde, donde
  no se puede consultar la base, así que no puede saber más que eso.
- **El permiso de verdad** —si la cuenta está habilitada y con qué rol— se
  resuelve contra la base en cada pantalla y en cada endpoint
  (`src/lib/sesion.ts`). Por eso dar de baja una cuenta tiene efecto en la
  petición siguiente, y no cuando venza el token que esa persona tiene en el
  celular.

Nunca puede quedar el sistema sin administradores: el endpoint rechaza sacarle
el rol o el acceso al último que quede activo, y nadie puede modificar su
propia cuenta. Son resguardos del servidor, no de la interfaz, porque a esa
dirección se puede llegar también escribiendo la petición a mano.

El manifiesto, el service worker y los íconos quedan fuera del portón a
propósito: el navegador los pide **sin credenciales**, y si respondieran con
una redirección al login la app no se podría instalar en el celular.

### Lo demás que protege la app

- **Cabeceras de seguridad en todas las respuestas**, incluida una política
  de contenido con nonce por petición: si algún día se colara texto de una
  planilla que en realidad es código, el navegador se niega a ejecutarlo.
  También se bloquea que otro sitio muestre la app dentro de un marco para
  engañar a alguien y hacerle tocar botones que no ve.
- **Las fotos se verifican por su contenido**, no por lo que declara el
  navegador: ese dato lo pone quien sube y se puede falsear. El formato se
  reconoce por la firma de los primeros bytes, y de ahí en adelante se usa el
  tipo detectado. Un archivo cualquiera renombrado a `.jpg` no entra.
- **Tope de 40 lecturas por hora y por persona.** Cada una le cuesta plata al
  municipio; una cuenta que se desmadre no puede gastar sin techo.
- **Quién cargó y quién confirmó cada planilla** queda registrado y se ve en
  el historial. Confirmar es el acto por el que alguien se hace responsable de
  que lo cargado coincide con el papel, y es lo que habilita el descuento de
  stock.
- **El detalle técnico de un fallo no se muestra en pantalla.** Esos textos
  vienen en inglés y mencionan claves, cuotas y URLs internas; van a un campo
  aparte que sólo ven los administradores.
- **El destino al que se vuelve después de entrar se valida.** Sin ese filtro,
  un enlace preparado podría usar el login como trampolín hacia otra página.

Dar de baja a alguien nunca borra sus planillas: el vínculo queda en nulo y el
histórico sigue entero. El histórico es el activo del sistema, no las cuentas.

## Para ampliar

Lo obvio que sigue, en orden de utilidad:

- Stock mínimo por material, para avisar antes de llegar a cero y no después.
- Búsqueda por calle o localidad, además de por N.º de incidente.
- Procesamiento en segundo plano con una cola, para planillas muy largas.
- Corrección de perspectiva de la foto antes de mandarla al modelo.
