# Poner la app en internet, paso a paso

Sin consola de servidor. Se conecta GitHub, se aprietan botones y Render arma
todo leyendo el archivo `render.yaml` del repositorio.

**Si algo en pantalla no se llama como dice acá, no improvises**: el panel de
Render cambia seguido. Sacá una captura y consultá antes de seguir.

Tiempo: entre 30 y 45 minutos, la mayoría esperando que compile.

---

## Antes de empezar

Tenés que tener a mano:

- La cuenta de GitHub donde está el repositorio
- Las dos credenciales de Google (`AUTH_GOOGLE_ID` y `AUTH_GOOGLE_SECRET`)
- La clave de Gemini (`GEMINI_API_KEY`)

Están todas en tu archivo `.env`. Abrilo y tenelo al costado.

**Costo**: alrededor de 14 dólares por mes (7 la app, 7 la base). Render pide
tarjeta. La base de datos gratuita de Render **se borra a los 30 días**, así
que el archivo pide la paga desde el principio: no vale la pena arrancar con
algo que va a desaparecer con los datos adentro.

---

## 1. Crear la cuenta

Entrá a [render.com](https://render.com) y registrate **con tu cuenta de
GitHub**. Así queda conectado solo y te evitás un paso.

Cuando te pida permisos sobre los repositorios, alcanza con darle acceso a
`Registro-de-tareas-`.

## 2. Crear todo de una vez

En el panel: **New +** (arriba a la derecha) → **Blueprint**.

Elegí el repositorio `Registro-de-tareas-` y la rama `main`.

Render va a leer el archivo `render.yaml` y mostrarte lo que va a crear:

- Un servicio web llamado `registro-de-tareas`
- Una base de datos llamada `registro-tareas-db`

Si no encuentra el archivo, revisá que estés en la rama `main`.

## 3. Cargar las claves

Antes de crear, te va a pedir los valores que no están en el repositorio.
Cargá estos cuatro:

| Campo | Qué poner |
|---|---|
| `AUTH_URL` | `https://registro-de-tareas.onrender.com` |
| `AUTH_GOOGLE_ID` | El que termina en `.apps.googleusercontent.com` |
| `AUTH_GOOGLE_SECRET` | El que empieza con `GOCSPX-` |
| `GEMINI_API_KEY` | El que empieza con `AQ.` |

`DOMINIO_VECINOS` dejalo **vacío** por ahora. Se completa al final, cuando los
dominios estén conectados.

Sobre `AUTH_URL`: esa es la dirección que Render te va a dar. Si el nombre
`registro-de-tareas` ya está tomado por otra persona, Render le agrega algo al
final — en ese caso, corregilo en el paso 5.

Apretá **Apply** y esperá. La primera compilación tarda entre 5 y 10 minutos.

## 4. Ver si arrancó

Cuando termine, entrá al servicio y mirá la pestaña **Logs**. Tenés que ver:

```
→ Aplicando migraciones…
→ Cargando el catálogo de materiales…
Catálogo cargado: 20 materiales.
→ Servidor en el puerto 10000
```

Si ves esas tres líneas, la app está viva y la base quedó armada.

Probá la dirección que te dio Render, agregándole `/alumbrado`:

```
https://registro-de-tareas.onrender.com/alumbrado
```

Tiene que aparecer la página del vecino. **Esa es la prueba de que funciona**:
es la única pantalla que no pide sesión.

## 5. Habilitar el login

Todavía no vas a poder entrar: Google no conoce esta dirección nueva.

Primero verificá que `AUTH_URL` coincida con la dirección real. En el servicio
→ **Environment** → mirá el valor. Si Render te dio otra dirección, corregilo
acá y guardá (la app se reinicia sola).

Después, en [console.cloud.google.com](https://console.cloud.google.com):

**APIs y servicios** → **Credenciales** → tu ID de cliente. Ahí hay dos campos
que se confunden fácil, y hay que completar los dos.

En **Orígenes autorizados de JavaScript**, sólo el dominio:

```
https://registro-de-tareas.onrender.com
```

En **URI de redireccionamiento autorizados**, el mismo con la ruta:

```
https://registro-de-tareas.onrender.com/api/auth/callback/google
```

Sin barra al final, y con la dirección exacta que te dio Render. Guardá.

Los cambios de Google pueden tardar unos minutos. Después entrá a la dirección
sin `/alumbrado` y probá **Entrar con Google**.

Tu cuenta ya existe en tu base local, pero **esta es una base nueva y vacía**:
vas a volver a ser la primera cuenta del sistema, así que quedás administrador
de nuevo.

## 6. Conectar tus dominios

En el servicio → **Settings** → **Custom Domains** → **Add Custom Domain**.

Agregá los dos, uno por vez:

- `registros-de-tareas.com.ar`
- `vecinos-lacosta.com.ar`

Render te va a dar, para cada uno, un valor que hay que cargar en el panel de
tu proveedor de dominio. Puede ser un registro `A` con una dirección IP o un
`CNAME` — **usá exactamente el que te muestre Render**, no el que diga esta
guía.

Cargalos en tu proveedor y volvé a Render: cuando el dominio se ponga en verde,
está listo. Puede tardar desde minutos hasta unas horas.

El certificado HTTPS lo saca Render solo.

## 7. El último ajuste

Con los dominios andando, dos cambios:

**En Render** → Environment:

| Variable | Valor nuevo |
|---|---|
| `AUTH_URL` | `https://registros-de-tareas.com.ar` |
| `DOMINIO_VECINOS` | `vecinos-lacosta.com.ar` |

**En Google** hay que completar **dos campos distintos**, y se confunden fácil:

**Orígenes autorizados de JavaScript** — de dónde sale el pedido. Sólo el
dominio, sin barra ni nada después:

```
https://registros-de-tareas.com.ar
https://vecinos-lacosta.com.ar
```

**URI de redireccionamiento autorizados** — adónde vuelve Google cuando la
persona ya eligió su cuenta. Los mismos dominios, con la ruta completa:

```
https://registros-de-tareas.com.ar/api/auth/callback/google
https://vecinos-lacosta.com.ar/api/auth/callback/google
```

El del vecino es el que más se olvida, y sin él entra a la página, aprieta
reportar y no puede pasar de ahí: desde que reportar exige cuenta, también
inicia sesión con Google, y lo hace desde su propio dominio. Las credenciales
son las mismas para las dos apps — lo único que se agrega es la dirección.

Dejá también las de `onrender.com` y las de `localhost:3000`: no molestan, y
te sirven para probar o si algún día hay un problema con el dominio.

Guardá en Render y esperá a que se reinicie.

## 8. Comprobar que quedó todo

- [ ] `vecinos-lacosta.com.ar` abre la página que explica el servicio
- [ ] Desde ahí, entrar con Google como vecino funciona
- [ ] Cargar un reclamo de prueba funciona de punta a punta
- [ ] En "Mis reclamos" aparece el que acabás de cargar
- [ ] `vecinos-lacosta.com.ar/tablero` **no** entra: devuelve al inicio
- [ ] `registros-de-tareas.com.ar` pide entrar con Google
- [ ] Entrás y quedás como administrador
- [ ] En **Vecinos** aparece el reclamo de prueba, en la cuadrilla correcta
- [ ] Subir una foto de planilla la lee y la muestra para revisar

---

## Si algo falla

**La compilación se cae.** Mirá los Logs y buscá la primera línea con `Error`.
Suele ser una variable de entorno que quedó sin cargar.

**Entra pero da error al iniciar sesión.** Casi siempre es
`redirect_uri_mismatch`: la dirección cargada en Google no coincide
exactamente con la real. Revisá `https` contra `http`, y que no sobre una
barra al final.

**Dice que la base no responde.** Entrá a la base en Render y fijate que esté
en estado *available*. La primera vez tarda un rato en estar lista.

**La app se reinicia sola cada tanto.** Puede ser falta de memoria en el plan
más chico. En Logs vas a ver `Out of memory`. Se resuelve subiendo el plan de
la app un escalón.

---

## Después

**Las copias de la base.** Render hace copias automáticas en los planes pagos,
pero viven en Render. Para tener una afuera, `docker/bajar-copias.sh` está
pensado para un servidor propio; con Render se descargan desde el panel de la
base. Conviene bajar una cada tanto y guardarla en otro lado.

**Actualizar la app.** Cada vez que se sube algo a `main`, Render lo compila y
lo publica solo. No hay que hacer nada más.

**Lo que gasta Gemini.** Cada planilla leída se cobra. Mirá el consumo en
`aistudio.google.com` la primera semana para saber con qué números estás
trabajando antes de que la cuadrilla lo use todos los días.
