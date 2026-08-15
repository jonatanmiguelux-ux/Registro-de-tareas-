import { NextResponse } from "next/server";
import { usuarioActual } from "@/lib/sesion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/sesion — quién está conectado.
 *
 * Existe para que el encabezado pueda mostrar el nombre sin que el layout
 * tenga que leer la sesión en el servidor: si lo hiciera, todas las pantallas
 * pasarían a renderizarse a demanda, incluida la de cargar, que tiene que
 * seguir siendo estática para poder abrirse sin señal.
 *
 * Devuelve 200 con `null` cuando no hay sesión, en vez de 401: para el
 * encabezado "no hay nadie" es una respuesta válida, no un error.
 */
export async function GET() {
  const usuario = await usuarioActual();

  if (!usuario) return NextResponse.json({ usuario: null });

  return NextResponse.json({
    usuario: {
      nombre: usuario.nombre,
      email: usuario.email,
      imagen: usuario.imagen,
      rol: usuario.rol,
      estado: usuario.estado,
    },
  });
}
