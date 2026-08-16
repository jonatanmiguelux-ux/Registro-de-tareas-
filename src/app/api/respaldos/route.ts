import { NextResponse } from "next/server";
import { z } from "zod";
import { rolDeApi } from "@/lib/sesion";
import {
  guardarConfig,
  leerConfig,
  resolverDestino,
  sePuedeEscribir,
  subirPendientes,
  listarPendientes,
} from "@/lib/respaldos";

export const runtime = "nodejs";

const Cambios = z.object({
  /** Vacío = volver a buscar la carpeta sola. */
  destino: z.string().trim().max(400),
  conservar: z.number().int().min(1).max(3650),
});

/**
 * POST /api/respaldos — guarda a qué carpeta va el Excel de cada día.
 *
 * Es del administrador y de nadie más: elegir dónde queda la información del
 * municipio no es una decisión operativa.
 *
 * Al guardar se hacen dos cosas en el mismo movimiento. Primero se comprueba
 * que la carpeta exista y se pueda escribir —una ruta mal tipeada haría que el
 * respaldo fallara todos los días a las 12, cuando no hay nadie mirando—. Y
 * después se sube lo que estuviera esperando, para que configurar la nube y
 * ponerse al día sean el mismo acto y no dos que alguien tenga que recordar.
 */
export async function POST(request: Request) {
  const sesion = await rolDeApi("ADMINISTRADOR");
  if (!sesion.ok) return sesion.respuesta;

  const cuerpo = Cambios.safeParse(await request.json().catch(() => null));
  if (!cuerpo.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const destino = cuerpo.data.destino.trim();

  if (destino && !(await sePuedeEscribir(destino))) {
    return NextResponse.json(
      {
        error:
          "No puedo escribir en esa carpeta. Revisá que la ruta esté bien y que la nube esté instalada y andando.",
      },
      { status: 400 },
    );
  }

  await guardarConfig({ destino, conservar: cuerpo.data.conservar });

  // Con la nube recién configurada, lo que estaba en espera se va solo.
  const resuelto = await resolverDestino({
    destino,
    conservar: cuerpo.data.conservar,
  });

  let subidos = 0;
  if (resuelto.enLaNube) {
    subidos = await subirPendientes(resuelto.ruta);
  }

  return NextResponse.json({
    ok: true,
    destino: resuelto,
    subidos,
    pendientes: (await listarPendientes()).length,
  });
}

/** GET /api/respaldos — cómo está la cosa ahora mismo. */
export async function GET() {
  const sesion = await rolDeApi("ADMINISTRADOR");
  if (!sesion.ok) return sesion.respuesta;

  const config = await leerConfig();
  return NextResponse.json({
    config,
    destino: await resolverDestino(config),
    pendientes: await listarPendientes(),
  });
}
