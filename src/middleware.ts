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
];

function esPublica(ruta: string): boolean {
  return PUBLICAS.some((p) => ruta === p || ruta.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (esPublica(pathname)) return NextResponse.next();

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production",
  });

  if (token) return NextResponse.next();

  // A la API se le contesta con un error, no con una redirección: quien la
  // llamó es la app, y una redirección al HTML del login le llegaría como una
  // respuesta ilegible.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Hay que iniciar sesión." }, { status: 401 });
  }

  const destino = new URL("/acceso", request.url);
  // Para volver a donde iba después de entrar.
  destino.searchParams.set("volver", pathname + request.nextUrl.search);
  return NextResponse.redirect(destino);
}

export const config = {
  // Todo menos los archivos internos de Next y los estáticos con extensión.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
