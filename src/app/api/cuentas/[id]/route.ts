import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { administradorDeApi } from "@/lib/sesion";

export const runtime = "nodejs";

const Cambios = z.object({
  estado: z.enum(["PENDIENTE", "ACTIVO", "BLOQUEADO"]).optional(),
  rol: z.enum(["OPERARIO", "ADMINISTRADOR"]).optional(),
});

/**
 * PATCH /api/cuentas/:id — habilita, da de baja o cambia el rol de una cuenta.
 *
 * Dos resguardos que no dependen de la interfaz, porque acá se puede llegar
 * también escribiendo la petición a mano:
 *
 * 1. Nadie se modifica a sí mismo. Quitarse el acceso o bajarse el rol
 *    dejaría a esa persona afuera sin forma de volver.
 * 2. Nunca puede quedar el sistema sin ningún administrador activo. Si se
 *    permitiera, la única salida sería entrar a la base a mano.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const sesion = await administradorDeApi();
  if (!sesion.ok) return sesion.respuesta;

  const { id } = await params;

  if (id === sesion.usuario.id) {
    return NextResponse.json(
      { error: "No podés modificar tu propia cuenta." },
      { status: 400 },
    );
  }

  const cuerpo = Cambios.safeParse(await request.json());
  if (!cuerpo.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const objetivo = await prisma.user.findUnique({
    where: { id },
    select: { id: true, rol: true, estado: true },
  });

  if (!objetivo) {
    return NextResponse.json({ error: "No existe la cuenta." }, { status: 404 });
  }

  const { estado, rol } = cuerpo.data;

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
