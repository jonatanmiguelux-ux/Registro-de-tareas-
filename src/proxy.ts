import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Portón de entrada: nada de la app se sirve sin sesión.
 *
 * Acá sólo se verifica que **haya** sesión, que es lo único que se puede
 * comprobar en el borde sin consultar la base. El permiso de verdad —si la
 * cuenta está habilitada y con qué rol— lo resuelve `sesion.ts` en cada
 * pantalla y en cada endpoint, leyendo la base, así un bloqueo tiene efecto
 * en la petición siguiente y no cuando venza el token.
 *
 * Lo que queda afuera del portón está abajo, y cada exclusión tiene motivo.
 */

/**
 * Rutas públicas.
 *
 * El manifiesto, el service worker y los íconos tienen que seguir siendo
 * públicos: el navegador los pide **sin credenciales**, y si respondieran con
 * una redirección al login la app no se podría instalar en el celular.
 */
const PUBLICAS = [
  "/acceso",
  "/api/auth",
  "/manifest.webmanifest",
  "/sw.js",
  "/sin-conexion.html",
  "/icono",
  // Lo del vecino: la página que explica el servicio, la carga del reclamo y
  // su seguimiento. Sin cuenta. Es lo único de la app abierto a internet, y
  // por eso sus endpoints validan todo en el servidor y tienen tope por hora.
  "/alumbrado",
  "/reclamar",
  "/reclamo",
  "/api/reclamos-vecinales",
];

/**
 * Lo que se puede ver desde el dominio del vecino.
 *
 * Es una lista corta y cerrada: desde ese dominio la app del municipio no
 * existe. Aunque alguien escriba /tablero a mano, no llega — se lo devuelve
 * al inicio. Así las dos apps comparten servidor sin compartir superficie.
 *
 * `/api/reclamos-vecinales` entra sólo exacto: sus subrutas —la foto, la
 * edición— son del municipio y exigen sesión.
 */
function permitidaParaVecinos(ruta: string): boolean {
  return (
    ruta === "/" ||
    ruta === "/alumbrado" ||
    ruta === "/reclamar" ||
    ruta.startsWith("/reclamo/") ||
    ruta === "/api/reclamos-vecinales" ||
    ruta.startsWith("/icono/") ||
    ruta === "/favicon.ico"
  );
}

/** ¿La petición entró por el dominio que se le da a los vecinos? */
function esDominioDeVecinos(host: string | null): boolean {
  const configurado = process.env.DOMINIO_VECINOS?.trim().toLowerCase();
  if (!configurado || !host) return false;
  // Sin el puerto: en el servidor llega con el dominio pelado, pero al probar
  // en una PC puede venir como "localhost:3000".
  return host.toLowerCase().split(":")[0] === configurado;
}

function esPublica(ruta: string): boolean {
  return PUBLICAS.some((p) => ruta === p || ruta.startsWith(`${p}/`));
}

/**
 * Cabeceras de seguridad, aplicadas a todo lo que sale.
 *
 * La política de contenido (CSP) es la que más trabaja: si algún día se
 * colara texto de una planilla que en realidad es código, el navegador se
 * niega a ejecutarlo porque no lleva el nonce de esta petición.
 *
 * `'strict-dynamic'` deja que los scripts propios carguen los suyos —Next
 * hace exactamente eso— sin tener que enumerar cada archivo.
 */
function politicaDeContenido(nonce: string): string {
  const enDesarrollo = process.env.NODE_ENV !== "production";

  return [
    "default-src 'self'",
    // 'unsafe-eval' sólo en desarrollo: lo necesita la recarga en caliente.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${enDesarrollo ? "'unsafe-eval'" : ""}`,
    // Tailwind y Next insertan estilos en la propia página.
    "style-src 'self' 'unsafe-inline'",
    // blob: y data: son las vistas previas de la foto antes de subirla;
    // lh3 es donde Google aloja las fotos de perfil.
    "img-src 'self' blob: data: https://lh3.googleusercontent.com",
    "font-src 'self'",
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    // Nada de plugins, ni de que otro sitio nos muestre dentro de un marco
    // para engañar a alguien y hacerle tocar botones que no ve.
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    // Los formularios sólo pueden enviar a este sitio.
    "form-action 'self'",
    ...(enDesarrollo ? [] : ["upgrade-insecure-requests"]),
  ]
    .filter(Boolean)
    .join("; ");
}

function conCabeceras(respuesta: NextResponse, csp: string): NextResponse {
  respuesta.headers.set("Content-Security-Policy", csp);
  // No adivinar el tipo de un archivo por su contenido: evita que algo
  // subido como imagen termine interpretándose como script.
  respuesta.headers.set("X-Content-Type-Options", "nosniff");
  respuesta.headers.set("X-Frame-Options", "DENY");
  respuesta.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // La app no usa nada de esto; negarlo de entrada.
  respuesta.headers.set(
    "Permissions-Policy",
    "geolocation=(), microphone=(), payment=(), usb=(), interest-cohort=()",
  );
  if (process.env.NODE_ENV === "production") {
    // Un año de HTTPS obligatorio: después de la primera visita, el navegador
    // ya no intenta entrar por HTTP aunque alguien fuerce el enlace.
    respuesta.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }
  return respuesta;
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const nonce = crypto.randomUUID().replace(/-/g, "");
  const csp = politicaDeContenido(nonce);

  // Next lee el nonce de esta cabecera para ponérselo a sus propios scripts.
  const cabecerasEntrantes = new Headers(request.headers);
  cabecerasEntrantes.set("x-nonce", nonce);
  cabecerasEntrantes.set("Content-Security-Policy", csp);
  const seguir = () =>
    NextResponse.next({ request: { headers: cabecerasEntrantes } });

  // Desde el dominio del vecino, la app del municipio no existe.
  if (esDominioDeVecinos(request.headers.get("host"))) {
    if (!permitidaParaVecinos(pathname)) {
      return conCabeceras(
        NextResponse.redirect(new URL("/alumbrado", request.url)),
        csp,
      );
    }
    // La raíz de ese dominio muestra la página que explica el servicio, no la
    // pantalla de cargar planillas. Es una reescritura y no una redirección:
    // la dirección que ve el vecino sigue siendo la del dominio pelado.
    if (pathname === "/") {
      return conCabeceras(
        NextResponse.rewrite(new URL("/alumbrado", request.url), {
          request: { headers: cabecerasEntrantes },
        }),
        csp,
      );
    }
    return conCabeceras(seguir(), csp);
  }

  if (esPublica(pathname)) return conCabeceras(seguir(), csp);

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production",
  });

  if (token) return conCabeceras(seguir(), csp);

  // A la API se le contesta con un error, no con una redirección: quien la
  // llamó es la app, y una redirección al HTML del login le llegaría como una
  // respuesta ilegible.
  if (pathname.startsWith("/api/")) {
    return conCabeceras(
      NextResponse.json({ error: "Hay que iniciar sesión." }, { status: 401 }),
      csp,
    );
  }

  const destino = new URL("/acceso", request.url);
  // Para volver a donde iba después de entrar. Sólo rutas de este sitio: si
  // se aceptara cualquier valor, un enlace preparado podría usar el login
  // como trampolín hacia otra página.
  const volver = pathname + request.nextUrl.search;
  if (volver.startsWith("/") && !volver.startsWith("//")) {
    destino.searchParams.set("volver", volver);
  }
  return conCabeceras(NextResponse.redirect(destino), csp);
}

export const config = {
  // Todo menos los archivos internos de Next y los estáticos con extensión.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
