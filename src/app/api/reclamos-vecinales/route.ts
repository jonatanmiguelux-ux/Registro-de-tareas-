import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardarImagen } from "@/lib/almacenamiento";
import { verificarImagen } from "@/lib/imagenes";
import { normalizarLocalidad } from "@/lib/localidades";
import { cuadrillaDeLocalidad } from "@/lib/cuadrillas";
import { vecinoDeApi } from "@/lib/sesion";
import {
  inicioDeVentana,
  esMismoLugar,
  avisoDeDuplicado,
} from "@/lib/duplicados-vecinales";
import { listarCuadrillas } from "@/lib/cuadrillas-db";
import { generarCodigoSeguimiento } from "@/lib/reclamos-vecinales";
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

  // Calle y altura son texto libre del vecino. Sin tope, una petición hecha a
  // mano podía guardar miles de caracteres por campo. La localidad sale de una
  // lista fija, pero se acota igual por si un día deja de estarlo.
  if (localidad.length > 80 || calle.length > 200 || numero.length > 40) {
    return NextResponse.json(
      { error: "Alguno de los datos de la dirección es demasiado largo." },
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

  // Se guarda con el nombre completo, igual que en las planillas, para que un
  // día se puedan cruzar los dos lados por localidad.
  const localidadNormalizada = normalizarLocalidad(localidad) ?? localidad;

  // ¿Ya avisó otro vecino por esta misma luminaria?
  //
  // Va **antes** de guardar la foto: si el reclamo no se va a crear, no tiene
  // sentido dejar 20 MB tirados en el disco.
  //
  // Se comparan sólo los de los últimos 3 días hábiles y se ignoran los
  // descartados. Si pasada esa semana laboral corta la luz sigue apagada, el
  // vecino puede volver a reportarla y esta vez el aviso significa otra cosa:
  // que no la arreglaron.
  const desde = inicioDeVentana(new Date());
  const enLaZona = await prisma.reclamoVecinal.findMany({
    where: {
      localidad: localidadNormalizada,
      creadoEn: { gte: desde },
      estado: { in: ["RECIBIDO", "DERIVADO"] },
    },
    select: { localidad: true, calle: true, numero: true, cuadrilla: true },
  });

  const yaReportado = enLaZona.find((r) =>
    esMismoLugar(r, { localidad: localidadNormalizada, calle, numero }),
  );

  if (yaReportado) {
    // 409 y no 400: no está mal lo que mandó, ya está hecho. El aviso va en
    // `duplicado` y no en `error` para que la pantalla lo muestre como una
    // buena noticia y no como una falla suya.
    //
    // No se devuelve el código de seguimiento del otro reclamo: es de otra
    // persona, y con él se podría abrir su reclamo y ver su dirección.
    return NextResponse.json(
      {
        duplicado: true,
        mensaje: avisoDeDuplicado(yaReportado.cuadrilla),
      },
      { status: 409 },
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
