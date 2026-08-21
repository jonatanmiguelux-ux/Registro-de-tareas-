import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Cerrar sesión, por la vía más simple que existe.
 *
 * Es una dirección que se puede abrir a mano (escribiéndola en la barra) o
 * desde el botón "Cerrar sesión". No usa formularios, ni JavaScript, ni el
 * `signOut` de Auth.js —que detrás del proxy de Render se confundía de dominio
 * y no llegaba a borrar la galleta—. Acá se borra la galleta a mano y listo:
 * es lo que menos piezas tiene para fallar.
 *
 * Cerrar sesión con JWT es, al final, una sola cosa: borrar la galleta de
 * sesión. No hace falta consultar la base ni avisarle a nadie.
 */
export function GET(request: NextRequest) {
  // El dominio real lo pone el proxy en `x-forwarded-host`; `request.url`
  // traería la dirección interna de Render (0.0.0.0) y el redirect caería en
  // el vacío. Por eso se arma el destino con el host de las cabeceras.
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "";
  const protocolo =
    request.headers.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");

  // Cada dominio vuelve a su propia puerta: el vecino al inicio de su sitio,
  // el personal a la pantalla de acceso del municipio.
  const dominioVecinos = process.env.DOMINIO_VECINOS?.trim().toLowerCase();
  const esVecino =
    !!dominioVecinos && host.toLowerCase().split(":")[0] === dominioVecinos;

  const destino = new URL(
    esVecino ? "/" : "/acceso",
    `${protocolo}://${host}`,
  );
  const respuesta = NextResponse.redirect(destino, { status: 303 });

  // Barrido completo: cualquier galleta de sesión, con el prefijo que tenga
  // (`__Secure-` sobre HTTPS) o partida en pedazos (`.0`, `.1`), se borra.
  // Para que el navegador acepte borrar una `__Secure-`, el borrado tiene que
  // repetir el atributo Secure; por eso se pone explícito.
  const seguro = protocolo === "https";
  for (const galleta of request.cookies.getAll()) {
    if (galleta.name.includes("authjs") || galleta.name.includes("next-auth")) {
      respuesta.cookies.set(galleta.name, "", {
        path: "/",
        maxAge: 0,
        httpOnly: true,
        sameSite: "lax",
        secure: seguro || galleta.name.startsWith("__Secure-"),
      });
    }
  }

  return respuesta;
}
