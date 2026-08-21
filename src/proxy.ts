import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { COOKIE_DISPOSITIVO } from "@/lib/dispositivo-cookie";

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
  "/salir",
  "/api/auth",
  "/manifest.webmanifest",
  "/sw.js",
  // El manifest y el service worker de la app del vecino. El navegador los
  // pide sin credenciales para poder ofrecer instalarla; sin esto, no se
  // podría instalar.
  "/vecino.webmanifest",
  "/sw-vecino.js",
  "/sin-conexion.html",
  "/icono",
  // Lo del vecino que no necesita cuenta: la página que explica el servicio y
  // la pantalla de ingreso. Reportar, ver un reclamo y ver los propios sí
  // exigen sesión, y eso lo resuelve cada pantalla contra la base.
  "/alumbrado",
  "/descargar",
  "/ingresar",
  // Celular de cuadrilla: la activación (/c/<código>) y la pantalla, que se
  // abren sin sesión de Google. La pantalla sin galleta válida no muestra
  // ningún dato: sólo explica cómo activar el celular.
  "/c",
  "/cuadrilla",
];

/** Rutas por las que puede pasar un celular de cuadrilla ya activado. */
function esRutaDeDispositivo(ruta: string): boolean {
  return (
    ruta === "/cuadrilla" ||
    ruta.startsWith("/c/") ||
    ruta.startsWith("/api/dispositivo/") ||
    // La foto de un reclamo (el endpoint valida que sea de su cuadrilla).
    (ruta.startsWith("/api/reclamos-vecinales/") && ruta.endsWith("/foto"))
  );
}

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
    ruta === "/salir" ||
    ruta === "/alumbrado" ||
    ruta === "/descargar" ||
    ruta === "/ingresar" ||
    ruta === "/reclamar" ||
    ruta === "/mis-reclamos" ||
    ruta.startsWith("/reclamo/") ||
    ruta === "/api/reclamos-vecinales" ||
    // El encabezado consulta quién está conectado para mostrar "Mis reclamos".
    ruta === "/api/sesion" ||
    // El ingreso con Google pasa por acá: sin esto, el vecino no podría
    // entrar desde su propio dominio.
    ruta.startsWith("/api/auth/") ||
    ruta.startsWith("/icono/") ||
    // Para poder instalar la app desde el dominio del vecino.
    ruta === "/vecino.webmanifest" ||
    ruta === "/sw-vecino.js" ||
    ruta === "/favicon.ico"
  );
}

/**
 * Rutas del vecino que exigen sesión.
 *
 * Importa distinguirlas porque **hay dos puertas de entrada**, y mandar a
 * alguien a la equivocada no es un detalle estético: la cuenta se crea del
 * lado equivocado. Quien entra por el login del municipio queda como empleado
 * y en espera de aprobación, aunque sólo quisiera reportar una luz.
 */
function esDelVecino(ruta: string): boolean {
  return (
    ruta === "/reclamar" ||
    ruta === "/mis-reclamos" ||
    ruta.startsWith("/reclamo/")
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

  // El dominio real, para que Auth.js arme bien la vuelta desde Google.
  //
  // Hay dos dominios sobre la misma app (municipio y vecino), así que no se
  // puede fijar una única dirección: cada login tiene que volver al dominio
  // por el que entró, o la galleta de seguridad —que vive en ese dominio— no
  // coincide y el ingreso falla. Sin esto, y sin una dirección fija, Auth.js
  // adivina mal y usa la dirección interna del servidor (0.0.0.0). Acá el
  // `host` sí es el dominio público, así que se lo pasamos explícito.
  const hostReal = request.headers.get("host");
  if (hostReal) cabecerasEntrantes.set("x-forwarded-host", hostReal);
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

  // ── Celular de cuadrilla ──────────────────────────────────────────────
  //
  // No tiene sesión de Google: entra con la galleta de dispositivo. El proxy
  // sólo mira que la galleta exista y que la ruta sea de las suyas; quién es
  // de verdad —y de qué cuadrilla— lo valida la página o el endpoint contra la
  // base. Un celular de cuadrilla no llega a ninguna otra pantalla del
  // municipio: si intenta, vuelve a la suya.
  const tieneDispositivo = request.cookies.has(COOKIE_DISPOSITIVO);
  if (tieneDispositivo) {
    if (esRutaDeDispositivo(pathname)) return conCabeceras(seguir(), csp);
    if (pathname.startsWith("/api/")) {
      return conCabeceras(
        NextResponse.json(
          { error: "Este celular sólo puede ver su cuadrilla." },
          { status: 403 },
        ),
        csp,
      );
    }
    return conCabeceras(
      NextResponse.redirect(new URL("/cuadrilla", request.url)),
      csp,
    );
  }

  // El nombre de la galleta de sesión depende del **protocolo real**, no del
  // modo en que corre la app: sobre HTTPS Auth.js la guarda con prefijo
  // `__Secure-` y sobre HTTP sin él. Mirar NODE_ENV en vez del protocolo hacía
  // que acá se buscara un nombre y la página encontrara el otro: el proxy
  // mandaba al login, el login veía la sesión y devolvía al inicio, y el
  // navegador terminaba con "demasiadas redirecciones".
  //
  // Detrás de un servidor web la petición llega por HTTP aunque el visitante
  // esté en HTTPS, y eso se sabe por `x-forwarded-proto`.
  const esHttps =
    request.nextUrl.protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https";

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: esHttps,
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

  // Cada uno a su puerta: el vecino a la suya, el personal a la del municipio.
  const destino = new URL(
    esDelVecino(pathname) ? "/ingresar" : "/acceso",
    request.url,
  );
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
  // Todo menos los archivos internos de Next y las imágenes estáticas. Éstas
  // se sirven directo, sin pasar por el portón: son públicas por naturaleza
  // (íconos, la foto de la portada) y bloquearlas rompía la página. Las fotos
  // de planillas y reclamos NO entran acá: se sirven por /api/ y siguen
  // pidiendo sesión.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|webp|svg|gif|ico)$).*)",
  ],
};
