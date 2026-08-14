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

## Las pantallas

| Pantalla | Para qué |
|---|---|
| **Cargar** | Sacar la foto y mandarla a analizar |
| **Registros** | Historial agrupado por día, búsqueda por incidente y filtros |
| **Tablero** | Totales, pendientes, resumen diario y consumo por material |
| **Stock** | Stock inicial, entradas, salidas y stock actual |

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
npm run db:push

# 4. A andar
npm run dev
```

Abrí http://localhost:3000

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
src/lib/diagnosticos.ts     Siglas C/C, F/C, F/N → diagnóstico
src/lib/excel.ts            Armado del .xlsx
src/lib/materiales.ts       Catálogo de columnas, con alta automática
src/lib/cola.ts             Cola de fotos sin señal (IndexedDB)
src/app/manifest.ts         Manifiesto de la PWA (instalación en el celular)
public/sw.js                Service worker: sólo cachea estáticos, nunca datos
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

Las tres salen con autofiltro y encabezado fijo. Para exportar un solo día,
`desde` y `hasta` con la misma fecha (el botón "Excel del día" del resumen
diario ya lo hace).

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

## Sin login, a propósito

La app no tiene usuarios ni contraseñas, y no es algo pendiente: es una
decisión. Quien está en la calle con el papel abre la app y saca la foto. Una
pantalla de acceso entre el operario y la cámara agrega fricción justo en el
único momento que importa, y no protege gran cosa: los datos son partes de
trabajo de alumbrado público, no información sensible.

La contracara es que **cualquiera con la URL puede cargar, editar y borrar**.
Mientras la app viva en la red interna del municipio eso está bien. Si algún
día se publica en internet, hay que resolverlo antes.

## Para ampliar

Lo obvio que sigue, en orden de utilidad:

- Stock mínimo por material, para avisar antes de llegar a cero y no después.
- Búsqueda por calle o localidad, además de por N.º de incidente.
- Procesamiento en segundo plano con una cola, para planillas muy largas.
- Corrección de perspectiva de la foto antes de mandarla al modelo.
