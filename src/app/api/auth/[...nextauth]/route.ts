import { NextRequest } from "next/server";
import { handlers } from "@/auth";

export const runtime = "nodejs";

/**
 * Le corrige a Auth.js el dominio de la petición antes de que la procese.
 *
 * La misma app atiende dos dominios (el del municipio y el del vecino). Auth.js
 * arma la vuelta desde Google a partir de la URL de la petición, pero detrás
 * del servidor de Render esa URL trae la dirección interna (0.0.0.0), no el
 * dominio público. El proxy sí conoce el dominio real y lo deja en
 * `x-forwarded-host`; acá se reescribe la URL con ese dominio para que la
 * vuelta caiga en el mismo sitio por el que la persona entró —y así la galleta
 * de seguridad, que vive en ese dominio, coincida—.
 *
 * Sin esto, un vecino que entra por su dominio volvería al del municipio, no
 * encontraría su galleta y el ingreso fallaría.
 */
function conDominioReal(req: NextRequest): NextRequest {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!host) return req;

  const url = new URL(req.url);
  if (url.host === host) return req; // ya estaba bien

  // Separar el puerto: al reescribir hay que fijar host y puerto por
  // separado, o queda pegado el puerto interno del servidor (…:10000) y
  // Google rechaza la vuelta.
  const [hostname, puerto] = host.split(":");
  url.hostname = hostname;
  url.port = puerto ?? "";
  const proto = req.headers.get("x-forwarded-proto");
  url.protocol = proto
    ? `${proto}:`
    : host.startsWith("localhost")
      ? "http:"
      : "https:";

  return new NextRequest(url.toString(), {
    method: req.method,
    headers: req.headers,
    body: req.body,
    redirect: "manual",
    // Node exige declarar esto al reenviar un cuerpo en streaming (el POST
    // del inicio de sesión).
    ...(req.body ? { duplex: "half" } : {}),
  } as ConstructorParameters<typeof NextRequest>[1]);
}

export async function GET(req: NextRequest) {
  return handlers.GET(conDominioReal(req));
}

export async function POST(req: NextRequest) {
  return handlers.POST(conDominioReal(req));
}
