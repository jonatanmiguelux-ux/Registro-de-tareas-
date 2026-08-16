import { redirect } from "next/navigation";
import Link from "next/link";
import { signIn, marcarAltaDeVecino } from "@/auth";
import { usuarioActual } from "@/lib/sesion";

export const dynamic = "force-dynamic";

/**
 * Ingreso del vecino.
 *
 * Es la misma cuenta de Google que ya tiene: no hay registro que completar ni
 * contraseña que inventar. La primera vez que entra se le crea la cuenta sola
 * y queda activa —no necesita que nadie lo apruebe—, y de ahí en más ve sus
 * reclamos juntos sin tener que guardar cada número de seguimiento.
 */
export default async function PaginaIngresar({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const usuario = await usuarioActual();
  if (usuario) redirect("/mis-reclamos");

  // Sólo rutas de este sitio: sin este filtro, un enlace preparado podría usar
  // el ingreso como trampolín hacia otra página.
  const pedida = typeof params.volver === "string" ? params.volver : "/reclamar";
  const volver =
    pedida.startsWith("/") && !pedida.startsWith("//") ? pedida : "/reclamar";

  const error = typeof params.error === "string";

  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col justify-center">
      <div className="tarjeta p-6 text-center sm:p-8">
        <h1 className="text-xl font-semibold tracking-tight">
          Entrá para reportar
        </h1>
        <p className="bajada mt-2">
          Usá la cuenta de Google que ya tenés. No hay que crear ninguna
          contraseña.
        </p>

        {error && (
          <p className="mt-5 rounded-lg border border-red-200 bg-[var(--color-mal-fondo)] px-4 py-3 text-sm text-[var(--color-mal)]">
            No se pudo iniciar sesión. Probá de nuevo.
          </p>
        )}

        <form
          className="mt-6"
          action={async () => {
            "use server";
            // Marca de qué lado viene el alta, antes de salir hacia Google.
            await marcarAltaDeVecino();
            await signIn("google", { redirectTo: volver });
          }}
        >
          <button type="submit" className="boton-secundario w-full">
            <LogoGoogle />
            Continuar con Google
          </button>
        </form>

        <p className="mt-5 text-xs leading-relaxed text-[var(--color-tinta-3)]">
          Pedimos que entres para poder avisarte cómo sigue tu reclamo y para
          que puedas ver todos los tuyos en un solo lugar.
        </p>
      </div>

      <p className="mt-4 text-center text-sm">
        <Link
          href="/alumbrado"
          className="text-[var(--color-acento)] hover:underline"
        >
          Volver
        </Link>
      </p>
    </div>
  );
}

function LogoGoogle() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.1 24.5c0-1.6-.1-2.8-.4-4H24v7.3h12.1c-.2 2-1.6 5-4.6 7l-.1.3 6.7 5.2.5.1c4.2-3.9 6.5-9.6 6.5-15.9"
      />
      <path
        fill="#34A853"
        d="M24 46c6.1 0 11.2-2 14.9-5.5l-7.1-5.5c-1.9 1.3-4.5 2.3-7.8 2.3-5.9 0-11-3.9-12.8-9.3l-.3.1-6.9 5.4-.1.3C7.6 40.9 15.2 46 24 46"
      />
      <path
        fill="#FBBC05"
        d="M11.2 28c-.5-1.4-.8-2.9-.8-4.5s.3-3.1.7-4.5v-.3l-7-5.5-.2.1C2.5 16.4 1.7 20.1 1.7 24s.8 7.6 2.2 10.8z"
      />
      <path
        fill="#EA4335"
        d="M24 9.7c4.2 0 7 1.8 8.6 3.3l6.3-6.1C35.1 3.3 30.1 1 24 1 15.2 1 7.6 6.1 4 13.5l7.2 5.5C13 13.6 18.1 9.7 24 9.7"
      />
    </svg>
  );
}
