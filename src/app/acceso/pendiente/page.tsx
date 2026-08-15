import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { usuarioActual } from "@/lib/sesion";

export const dynamic = "force-dynamic";

/**
 * Sala de espera: la cuenta existe pero todavía no fue habilitada.
 *
 * Dice explícitamente qué correo pedir que habiliten, porque quien entró con
 * varias cuentas de Google encima no siempre sabe con cuál quedó.
 */
export default async function PaginaPendiente() {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/acceso");
  if (usuario.estado === "ACTIVO") redirect("/");

  const bloqueado = usuario.estado === "BLOQUEADO";

  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col justify-center">
      <div className="tarjeta p-6 text-center sm:p-8">
        <span
          className={`mx-auto grid size-14 place-items-center rounded-2xl ${
            bloqueado
              ? "bg-[var(--color-mal-fondo)]"
              : "bg-[var(--color-alerta-fondo)]"
          }`}
        >
          {bloqueado ? <IconoBloqueado /> : <IconoReloj />}
        </span>

        <h1 className="mt-5 text-xl font-semibold tracking-tight">
          {bloqueado ? "Tu acceso fue dado de baja" : "Falta que te habiliten"}
        </h1>

        <p className="bajada mt-2">
          {bloqueado ? (
            <>
              Un administrador retiró el acceso de esta cuenta. Si creés que es
              un error, habla con quien administra el sistema.
            </>
          ) : (
            <>
              Tu cuenta quedó creada y a la espera. Pedile a un administrador
              que la habilite; después entrás con el mismo botón de siempre.
            </>
          )}
        </p>

        {usuario.email && (
          <p className="mt-5 rounded-lg border border-[var(--color-borde)] bg-[var(--color-fondo)] px-4 py-3 text-sm">
            <span className="block text-xs text-[var(--color-tinta-3)]">
              La cuenta a habilitar es
            </span>
            <span className="mt-0.5 block font-medium break-all">
              {usuario.email}
            </span>
          </p>
        )}

        <form
          className="mt-6"
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/acceso" });
          }}
        >
          <button type="submit" className="boton-secundario w-full">
            Salir y entrar con otra cuenta
          </button>
        </form>
      </div>
    </div>
  );
}

function IconoReloj() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-alerta)"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

function IconoBloqueado() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-mal)"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <rect x="4.5" y="10.5" width="15" height="9.5" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </svg>
  );
}
