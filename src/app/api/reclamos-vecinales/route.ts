import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardarImagen } from "@/lib/almacenamiento";
import { verificarImagen } from "@/lib/imagenes";
import { normalizarLocalidad } from "@/lib/localidades";
import { cuadrillaDeLocalidad } from "@/lib/cuadrillas";
import { vecinoDeApi } from "@/lib/sesion";
import { permitir, LIMITES, mensajeDeEspera } from "@/lib/limite";
import { listarCuadrillas } from "@/lib/cuadrillas-db";
import {
  correoValido,
  generarCodigoSeguimiento,
  normalizarCorreo,
} from "@/lib/reclamos-vecinales";
import type { TipoFalla } from "@prisma/client";

export const runtime = "nodejs";

const TAMANIO_MAXIMO = 20 * 1024 * 1024;

/**
 * Tope de reclamos por hora y por cuenta.
 *
 * Se cuenta por cuenta y no por conexión: una familia comparte el wifi y no
 * tiene por qué compartir el tope, y una cuenta de Google es más trabajosa de
 * multiplicar que una dirección de internet.
 */
const POR_HORA = 5;

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
 * - Hay tope de reclamos por hora y por cuenta.
 */
export async function POST(request: Request) {
  // Reportar exige cuenta. El correo ya no se pide en el formulario: sale de
  // la sesión, que es un dato verificado por Google en vez de tipeado a mano.
  const sesion = await vecinoDeApi();
  if (!sesion.ok) return sesion.respuesta;

  // Antes de leer el formulario: si la persona ya se pasó, no tiene sentido
  // recibir una foto de 20 MB para después descartarla.
  const cupo = permitir(
    `reclamo:${sesion.usuario.id}`,
    LIMITES.reclamoVecinal.maximo,
    LIMITES.reclamoVecinal.ventanaMs,
  );
  if (!cupo.ok) {
    return NextResponse.json(
      { error: mensajeDeEspera(cupo.esperarSegundos) },
      { status: 429, headers: { "Retry-After": String(cupo.esperarSegundos) } },
    );
  }

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

  const desdeHaceUnaHora = new Date(Date.now() - 60 * 60 * 1000);
  const recientes = await prisma.reclamoVecinal.count({
    where: { vecinoId: sesion.usuario.id, creadoEn: { gte: desdeHaceUnaHora } },
  });
  if (recientes >= POR_HORA) {
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

  // Se guarda con el nombre completo, igual que en las planillas, para que un
  // día se puedan cruzar los dos lados por localidad.
  const localidadNormalizada = normalizarLocalidad(localidad) ?? localidad;

  const reclamo = await prisma.reclamoVecinal.create({
    data: {
      codigo,
      tipo,
      localidad: localidadNormalizada,
      // La zona decide sola a qué cuadrilla le toca: nadie tiene que mirar un
      // mapa ni acordarse de quién cubre qué.
      cuadrilla: cuadrillaDeLocalidad(localidadNormalizada, await listarCuadrillas()),
      calle,
      numero,
      observacion,
      fotoRuta,
      vecinoId: sesion.usuario.id,
      contacto: sesion.usuario.email,
    },
    select: { codigo: true },
  });

  return NextResponse.json({ codigo: reclamo.codigo }, { status: 201 });
}
