/*
 * Service worker de Registro de tareas.
 *
 * Es deliberadamente conservador. Los datos de esta app —planillas, stock,
 * historial— viven en el servidor y cambian todo el tiempo: servir una copia
 * vieja de una pantalla sería peor que no abrirla, porque nadie se daría
 * cuenta de que está mirando números de ayer.
 *
 * Por eso acá sólo se cachean los archivos estáticos, que llevan su hash en
 * el nombre y nunca cambian de contenido. Todo lo demás va a la red, y si no
 * hay red se muestra un aviso claro.
 *
 * Lo que NO hace (todavía): guardar una foto sacada sin señal para subirla
 * cuando vuelva la conexión. Eso necesita una cola en IndexedDB y sincronismo
 * en segundo plano; mientras no exista, es más honesto avisar que no hay red
 * que fingir que se guardó.
 */

const VERSION = "v3";
const ESTATICOS = `estaticos-${VERSION}`;
const CASCARA = `cascara-${VERSION}`;
const SIN_RED = "/sin-conexion.html";
const CARGAR = "/";

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(CASCARA)
      // La pantalla de cargar se guarda a propósito: es la única que tiene
      // que abrir sin señal, porque es donde se saca la foto que queda en
      // cola esperando la conexión. No trae datos del servidor, así que la
      // copia guardada nunca queda vieja.
      //
      // Desde que pide sesión, lo que se guarda acá es lo que el servidor le
      // contestó a **esta** persona. Si es del municipio, guarda la pantalla
      // de cargar; si es un vecino, guarda la redirección a su lado. En los
      // dos casos, lo que corresponde.
      .then((cache) => cache.addAll([SIN_RED, CARGAR, "/icono/icono-192.png"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nombres) =>
        Promise.all(
          nombres
            .filter((n) => n !== ESTATICOS && n !== CASCARA)
            .map((n) => caches.delete(n)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evento) => {
  const pedido = evento.request;

  // Subir una planilla, guardar correcciones, mover stock: nunca se tocan.
  if (pedido.method !== "GET") return;

  const url = new URL(pedido.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Navegación: siempre a la red primero, así nadie ve datos viejos.
  //
  // Sin red, la pantalla de cargar sale de la caché —para poder sacar la foto
  // igual— y el resto muestra el aviso de sin conexión, porque servir un
  // historial o un stock guardado sería mentir sobre el estado real.
  if (pedido.mode === "navigate") {
    evento.respondWith(
      fetch(pedido).catch(async () => {
        if (url.pathname === CARGAR) {
          const guardada = await caches.match(CARGAR);
          if (guardada) return guardada;
        }
        return (await caches.match(SIN_RED)) ?? Response.error();
      }),
    );
    return;
  }

  // Estáticos con hash en el nombre: se sirven de la caché y se guardan la
  // primera vez que se piden.
  const esEstatico =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icono/");

  if (!esEstatico) return;

  evento.respondWith(
    caches.match(pedido).then(
      (cacheado) =>
        cacheado ??
        fetch(pedido).then((respuesta) => {
          if (respuesta.ok) {
            const copia = respuesta.clone();
            caches.open(ESTATICOS).then((cache) => cache.put(pedido, copia));
          }
          return respuesta;
        }),
    ),
  );
});
