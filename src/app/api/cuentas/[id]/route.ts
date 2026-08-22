import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rolDeApi, alcanza } from "@/lib/sesion";

export const runtime = "nodejs";

const Cambios = z.object({
  estado: z.enum(["PENDIENTE", "ACTIVO", "BLOQUEADO"]).optional(),
  rol: z
    .enum(["OPERARIO", "ENCARGADO", "JEFE", "ADMINISTRADOR", "PANOLERO"])
    .optional(),
  // Número de cuadrilla, o null para sacarlo de toda cuadrilla. `optional`
  // distingue "no lo toques" de `null` que sí es un cambio a "ninguna".
  cuadrilla: z.number().int().positive().max(99).nullable().optional(),
});

/**
 * PATCH /api/cuentas/:id — habilita, da de baja o cambia el rol de una cuenta.
 *
 * Dos permisos distintos conviven en esta ruta:
 *
 * - **Habilitar y dar de baja** lo puede el jefe. Es la gestión de todos los
 *   días: entra alguien nuevo, se va otro.
 * - **Cambiar el rol** es sólo del administrador. Quién es qué define la
 *   jerarquía, y si el jefe pudiera tocarlo podría ascenderse a sí mismo o
 *   nombrar a otro por encima: la jerarquía se reescribiría desde adentro.
 *
 * Tres resguardos más, que viven acá y no en la interfaz porque a esta
 * dirección se puede llegar escribiendo la petición a mano:
 *
 * 1. Nadie se modifica a sí mismo.
 * 2. Nunca puede quedar el sistema sin administradores activos.
 * 3. Nadie puede tocar una cuenta de rol mayor o igual al propio. Sin esto,
 *    un jefe podría dar de baja al administrador.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const sesion = await rolDeApi("JEFE");
  if (!sesion.ok) return sesion.respuesta;

  const { id } = await params;

  if (id === sesion.usuario.id) {
    return NextResponse.json(
      { error: "No podés modificar tu propia cuenta." },
      { status: 400 },
    );
  }

  const cuerpo = Cambios.safeParse(await request.json().catch(() => null));
  if (!cuerpo.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const objetivo = await prisma.user.findUnique({
    where: { id },
    select: { id: true, rol: true, estado: true, tipo: true },
  });

  if (!objetivo || objetivo.tipo !== "PERSONAL") {
    return NextResponse.json({ error: "No existe la cuenta." }, { status: 404 });
  }

  // Nadie manda sobre un igual o un superior.
  if (
    alcanza(objetivo.rol, sesion.usuario.rol) &&
    sesion.usuario.rol !== "ADMINISTRADOR"
  ) {
    return NextResponse.json(
      { error: "No podés modificar una cuenta del mismo rango o mayor." },
      { status: 403 },
    );
  }

  const { estado, rol, cuadrilla } = cuerpo.data;

  if (rol && sesion.usuario.rol !== "ADMINISTRADOR") {
    return NextResponse.json(
      { error: "Cambiar el rol de una cuenta es sólo del administrador." },
      { status: 403 },
    );
  }

  // Asignar la cuadrilla es también sólo del administrador, igual que el rol:
  // define qué reclamos ve cada empleado.
  const cambiaCuadrilla = cuadrilla !== undefined;
  if (cambiaCuadrilla && sesion.usuario.rol !== "ADMINISTRADOR") {
    return NextResponse.json(
      { error: "Asignar la cuadrilla de una cuenta es sólo del administrador." },
      { status: 403 },
    );
  }

  // Si viene un número, tiene que ser una cuadrilla que exista. Null (sacarlo
  // de toda cuadrilla) siempre vale.
  if (cambiaCuadrilla && cuadrilla !== null) {
    const existe = await prisma.cuadrilla.findUnique({
      where: { numero: cuadrilla },
    });
    if (!existe) {
      return NextResponse.json(
        { error: `No existe la cuadrilla ${cuadrilla}.` },
        { status: 400 },
      );
    }
  }

  // ¿Este cambio deja al sistema sin administradores?
  const dejaDeSerAdmin =
    objetivo.rol === "ADMINISTRADOR" &&
    ((rol && rol !== "ADMINISTRADOR") || (estado && estado !== "ACTIVO"));

  if (dejaDeSerAdmin) {
    const activos = await prisma.user.count({
      where: { rol: "ADMINISTRADOR", estado: "ACTIVO" },
    });
    if (activos <= 1) {
      return NextResponse.json(
        {
          error:
            "Es el único administrador activo. Nombrá otro antes de sacarle el rol o el acceso.",
        },
        { status: 400 },
      );
    }
  }

  const habilitando = estado === "ACTIVO" && objetivo.estado !== "ACTIVO";

  await prisma.user.update({
    where: { id },
    data: {
      ...(estado ? { estado } : {}),
      ...(rol ? { rol } : {}),
      ...(cambiaCuadrilla ? { cuadrilla } : {}),
      ...(habilitando
        ? {
            habilitadoEn: new Date(),
            habilitadoPor: sesion.usuario.email ?? sesion.usuario.id,
          }
        : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
