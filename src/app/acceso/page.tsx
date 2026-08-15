import { redirect } from "next/navigation";
import { signIn, auth } from "@/auth";

export const dynamic = "force-dynamic";

/**
 * Pantalla de acceso.
 *
 * Un solo botón. No hay usuario ni contraseña que recordar: la identidad la
 * pone Google, y el permiso lo da un administrador desde la app.
 */
export default async function PaginaAcceso({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const sesion = await auth();
  if (sesion?.user) redirect("/");

  // A la pantalla de cargar no se puede mandar directo a alguien recién
  // logueado: es estática y no sabe si la cuenta está habilitada. Va a
  // /entrando, que lo averigua y lo manda a donde corresponda.
  const pedida = typeof params.volver === "string" ? params.volver : "/";
  const volver = pedida === "/" ? "/entrando" : pedida;
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col justify-center">
      <div className="tarjeta p-6 text-center sm:p-8">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--color-acento)]">
          <Farola />
        </span>

        <h1 className="mt-5 text-xl font-semibold tracking-tight">
          Registro de tareas
        </h1>
        <p className="bajada mt-1.5">
          Planillas de alumbrado público del municipio.
        </p>

        {error && (
          <p className="mt-5 rounded-lg border border-red-200 bg-[var(--color-mal-fondo)] px-4 py-3 text-sm text-[var(--color-mal)]">
            No se pudo iniciar sesión. Probá de nuevo; si sigue fallando,
            avisale a quien administra el sistema.
          </p>
        )}

        <form
          className="mt-6"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: volver });
          }}
        >
          <button type="submit" className="boton-secundario w-full">
            <LogoGoogle />
            Entrar con Google
          </button>
        </form>

        <p className="mt-5 text-xs leading-relaxed text-[var(--color-tinta-3)]">
          La primera vez, tu cuenta queda a la espera de que un administrador
          te habilite. No hace falta crear ninguna contraseña.
        </p>
      </div>
    </div>
  );
}

function Farola() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7.4 20V8.3q0-2.1 2.1-2.1h1.4"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M10.6 4.9h5.2l-1.2 3.2h-2.8z" fill="#fff" />
      <path
        d="M11.6 9.6l1.2 1.8M14.9 9.6l-1.2 1.8"
        stroke="#fff"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path d="M5.6 20.2h3.6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
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
