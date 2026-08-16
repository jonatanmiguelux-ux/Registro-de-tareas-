import { requerirRol } from "@/lib/sesion";
import { formatearMomento } from "@/lib/fechas";
import {
  leerConfig,
  resolverDestino,
  listarPendientes,
  listarEnDestino,
} from "@/lib/respaldos";
import { ConfiguracionRespaldo } from "@/components/ConfiguracionRespaldo";

export const dynamic = "force-dynamic";

/**
 * A dónde va el Excel de cada día. Sólo para el administrador.
 *
 * Esta pantalla existe únicamente del lado del municipio. El vecino no tiene
 * por qué saber que esto existe, y el dominio público ni siquiera puede
 * llegar hasta acá: el proxy manda cualquier ruta que no sea suya de vuelta
 * a la página de alumbrado.
 */
export default async function PaginaRespaldos() {
  await requerirRol("ADMINISTRADOR");

  const config = await leerConfig();
  const destino = await resolverDestino(config);
  const [pendientes, guardados] = await Promise.all([
    listarPendientes(),
    listarEnDestino(destino.ruta),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="titulo-pagina">Respaldos</h1>
        <p className="bajada mt-1.5">
          De lunes a viernes a las 12 la app genera el Excel con todo lo
          cargado y lo deja en una carpeta de la nube. Corre solo: nadie tiene
          que apretar nada. Si a esa hora la PC estaba apagada, corre en cuanto
          se prenda.
        </p>
      </div>

      <Estado destino={destino} pendientes={pendientes.length} />

      <section className="tarjeta overflow-hidden">
        <div className="tarjeta-titulo">
          <h2 className="text-sm font-semibold">Configuración</h2>
        </div>
        <div className="p-4 sm:p-5">
          <ConfiguracionRespaldo
            destinoInicial={destino}
            rutaInicial={config.destino}
            conservarInicial={config.conservar}
            pendientes={pendientes.length}
          />
        </div>
      </section>

      {pendientes.length > 0 && (
        <section className="tarjeta overflow-hidden border-[var(--color-alerta-borde)]">
          <div className="tarjeta-titulo bg-[var(--color-alerta-fondo)]">
            <h2 className="text-sm font-semibold text-[var(--color-alerta)]">
              {pendientes.length} esperando una nube
            </h2>
          </div>
          <ul className="divide-y divide-[var(--color-borde)]">
            {pendientes.map((p) => (
              <li key={p} className="px-4 py-2.5 font-mono text-xs">
                {p}
              </li>
            ))}
          </ul>
          <p className="border-t border-[var(--color-borde)] px-4 py-3 text-xs leading-relaxed text-[var(--color-tinta-3)]">
            No se perdió nada: están guardados en esta PC. En cuanto configures
            una carpeta arriba, se suben solos.
          </p>
        </section>
      )}

      <section className="tarjeta overflow-hidden">
        <div className="tarjeta-titulo">
          <h2 className="text-sm font-semibold">Últimos guardados</h2>
          <span className="text-xs text-[var(--color-tinta-3)]">
            {guardados.length} archivo{guardados.length === 1 ? "" : "s"}
          </span>
        </div>
        {guardados.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--color-tinta-3)]">
            Todavía no se guardó ninguno.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--color-borde)]">
            {guardados.slice(0, 10).map((g) => (
              <li
                key={g.nombre}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"
              >
                <span className="font-mono text-xs">{g.nombre}</span>
                <span className="text-xs text-[var(--color-tinta-3)]">
                  {(g.bytes / 1024).toFixed(0)} KB ·{" "}
                  {formatearMomento(g.fecha)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs leading-relaxed text-[var(--color-tinta-3)]">
        El Excel es un informe, no un respaldo completo: no incluye las fotos
        de las planillas. Para eso está <code>respaldar.bat</code>, en la
        carpeta del proyecto, que arma un archivo con la base y las fotos
        juntas.
      </p>
    </div>
  );
}

function Estado({
  destino,
  pendientes,
}: {
  destino: {
    ruta: string;
    enLaNube: boolean;
    manual: boolean;
    nombre: string;
  };
  pendientes: number;
}) {
  if (!destino.enLaNube) {
    return (
      <section className="tarjeta border-[var(--color-alerta-borde)] bg-[var(--color-alerta-fondo)] p-4 sm:p-5">
        <p className="text-sm font-semibold text-[var(--color-alerta)]">
          Sin nube configurada
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-tinta-2)]">
          El Excel se está guardando en esta PC y espera ahí. No se pierde
          nada, pero mientras tanto el respaldo no protege contra que se rompa
          esta máquina, que es justamente para lo que sirve.
        </p>
        <p className="mt-2 font-mono text-xs break-all text-[var(--color-tinta-3)]">
          {destino.ruta}
        </p>
      </section>
    );
  }

  return (
    <section className="tarjeta bg-[var(--color-bien-fondo)] p-4 sm:p-5">
      <p className="text-sm font-semibold text-[var(--color-bien)]">
        Guardando en {destino.nombre}
        {destino.manual ? "" : " (encontrada sola)"}
      </p>
      <p className="mt-2 font-mono text-xs break-all text-[var(--color-tinta-2)]">
        {destino.ruta}
      </p>
      {pendientes > 0 && (
        <p className="mt-2 text-xs text-[var(--color-alerta)]">
          Hay {pendientes} esperando de antes. Guardá la configuración para
          subirlos.
        </p>
      )}
    </section>
  );
}
