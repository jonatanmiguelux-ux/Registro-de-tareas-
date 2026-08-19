/*
 * Service worker de la app del vecino.
 *
 * Es lo minimo para que el celular ofrezca "instalar la app": el navegador
 * exige un service worker con un manejador de pedidos. Este NO cachea nada:
 * pasa todo a la red tal cual. La razon es la misma de siempre: un reclamo se
 * carga con conexion, y servir una version vieja de la pagina seria peor que
 * pedirla de nuevo. Instalarla solo le da un icono en la pantalla de inicio y
 * la abre sin la barra del navegador.
 */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (evento) => {
  // Pasa a la red sin tocar nada. Con esto alcanza para que sea instalable.
  evento.respondWith(fetch(evento.request));
});
