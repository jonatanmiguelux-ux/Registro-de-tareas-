import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardarImagen } from "@/lib/almacenamiento";
import { verificarImagen } from "@/lib/imagenes";
import { normalizarLocalidad } from "@/lib/localidades";
import {
  correoValido,
  generarCodigoSeguimiento,
  normalizarCorreo,
} from "@/lib/reclamos-vecinales";
import type { TipoFalla } from "@prisma/client";

export const runtime = "nodejs";

const TAMANIO_MAXIMO = 20 * 1024 * 1024;

/**
 * Tope por hora desde una misma conexión.
 *
 * Es lo único que frena la carga masiva: al no haber verificación ni cuenta,
 * no hay otra forma de distinguir a un vecino de un script.
 */
const POR_HORA_POR_IP = 5;

const TIPOS_VALIDOS: TipoFalla[] = ["NO_FUNCIONA", "ENCENDIDA", "INTERMITENTE"];

/**
 * POST /api/reclamos-vecinales — un vecino carga un reclamo.
 *
 * Es la única ruta de la app abierta a internet sin sesión, así que asume que
 * del otro lado puede haber cualquiera:
 *
 * - Todos los campos son obligatorios y se validan en el servidor. Lo que
 *   valida el formulario en el navegador es una comodidad, no una defensa:
 *   acá se puede llegar sin pasar por él.
 * - La foto se verifica por su contenido, igual que las de las planillas.
 * - Hay tope por hora y por conexión.
 */
export async function POST(request: Request) {
  const formulario = await request.formData().catch(() => null);
  if (!formulario) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const texto = (clave: string) => String(formulario.get(clave) ?? "").trim();

  const tipo = texto("tipo") as TipoFalla;
  const localidad = texto("localidad");
  const calle = texto("calle");
  const numero = texto("numero");
  const observacion = texto("observacion");
  const contacto = normalizarCorreo(texto("contacto"));
  const foto = formulario.get("foto");

  // Un mensaje por campo: "faltan datos" obliga a adivinar cuál.
  const faltan: string[] = [];
  if (!TIPOS_VALIDOS.includes(tipo)) faltan.push("qué le pasa a la luminaria");
  if (!localidad) faltan.push("la localidad");
  if (!calle) faltan.push("la calle");
  if (!numero) faltan.push("la altura");
  if (!observacion) faltan.push("una descripción");
  if (!(foto instanceof File) || foto.size === 0) faltan.push("una foto");

  if (faltan.length > 0) {
    return NextResponse.json(
      {
        error:
          faltan.length === 1
            ? `Falta ${faltan[0]}.`
            : `Faltan ${faltan.slice(0, -1).join(", ")} y ${faltan.at(-1)}.`,
      },
      { status: 400 },
    );
  }

  // Opcional, pero si lo escriben tiene que tener forma de correo: uno mal
  // tipeado es peor que ninguno, porque el aviso nunca llega y nadie se entera.
  if (contacto && !correoValido(contacto)) {
    return NextResponse.json(
      { error: "Revisá el correo: no parece una dirección válida." },
      { status: 400 },
    );
  }

  if (observacion.length > 1000) {
    return NextResponse.json(
      { error: "La descripción es demasiado larga." },
      { status: 400 },
    );
  }

  const archivo = foto as File;
  if (archivo.size > TAMANIO_MAXIMO) {
    return NextResponse.json(
      { error: "La foto supera los 20 MB. Sacala con menos resolución." },
      { status: 413 },
    );
  }

  // Detrás de Caddy la IP real llega en esta cabecera.
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "desconocida";

  const desdeHaceUnaHora = new Date(Date.now() - 60 * 60 * 1000);
  const recientes = await prisma.reclamoVecinal.count({
    where: { notaInterna: `ip:${ip}`, creadoEn: { gte: desdeHaceUnaHora } },
  });
  if (recientes >= POR_HORA_POR_IP) {
    return NextResponse.json(
      {
        error:
          "Ya cargaste varios reclamos en la última hora. Esperá un rato antes de cargar otro.",
      },
      { status: 429 },
    );
  }

  const bytes = Buffer.from(await archivo.arrayBuffer());
  const verificacion = verificarImagen(bytes, archivo.type);
  if (!verificacion.ok) {
    return NextResponse.json({ error: verificacion.motivo }, { status: 415 });
  }

  const fotoRuta = await guardarImagen(bytes, verificacion.tipo);

  const codigo = generarCodigoSeguimiento();

  const reclamo = await prisma.reclamoVecinal.create({
    data: {
      codigo,
      tipo,
      // Se guarda con el nombre completo, igual que en las planillas, para
      // que un día se puedan cruzar los dos lados por localidad.
      localidad: normalizarLocalidad(localidad) ?? localidad,
      calle,
      numero,
      observacion,
      fotoRuta,
      contacto: contacto || null,
      // La IP se guarda acá sólo para poder contar por hora. No se muestra.
      notaInterna: `ip:${ip}`,
    },
    select: { codigo: true },
  });

  return NextResponse.json({ codigo: reclamo.codigo }, { status: 201 });
}
