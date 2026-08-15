/**
 * Piezas de gráfico del tablero.
 *
 * Están hechas con HTML y CSS en vez de una librería de gráficos: son dos
 * formas simples, se arman en el servidor —así el tablero llega dibujado y no
 * parpadea— y no suman kilobytes de JavaScript a una app que se abre con
 * datos móviles en la calle.
 *
 * Reglas que se respetan en las dos formas:
 *
 * - **Un solo eje.** Nunca dos escalas en el mismo gráfico: si hay dos
 *   medidas de magnitud distinta, van en dos gráficos.
 * - **El color sigue a la entidad, no al puesto.** El grupo de material fija
 *   el color, así filtrar no repinta lo que quedó.
 * - **Nada depende sólo del color**: cada barra lleva su número escrito y su
 *   nombre, y hay leyenda cuando hay más de una serie.
 */

/** Grupos de la planilla, cada uno con su color fijo. */
const COLOR_GRUPO: Record<string, string> = {
  Lámparas: "var(--color-serie-1)",
  Balastos: "var(--color-serie-2)",
  "Otros materiales": "var(--color-serie-3)",
};

const COLOR_SIN_GRUPO = "var(--color-tinta-3)";

export function colorDeGrupo(grupo: string | null): string {
  return (grupo && COLOR_GRUPO[grupo]) || COLOR_SIN_GRUPO;
}

export function Leyenda({ grupos }: { grupos: string[] }) {
  if (grupos.length < 2) return null;
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {grupos.map((g) => (
        <li
          key={g}
          className="flex items-center gap-1.5 text-xs text-[var(--color-tinta-2)]"
        >
          <span
            className="size-2.5 rounded-full"
            style={{ background: colorDeGrupo(g) }}
            aria-hidden="true"
          />
          {g}
        </li>
      ))}
    </ul>
  );
}

export type BarraDato = {
  clave: string;
  etiqueta: string;
  valor: number;
  color: string;
  /** Renglón chico bajo el nombre. */
  detalle?: string;
  /** Sufijo del número (la unidad). */
  sufijo?: string;
};

/**
 * Barras horizontales para comparar magnitudes entre categorías.
 *
 * Horizontales y no verticales porque los nombres de material son largos
 * ("Fotocontrol", "B 150 ext"): en vertical habría que rotarlos y se vuelven
 * ilegibles justo en el celular, que es donde más se mira esto.
 */
export function GraficoBarras({ datos }: { datos: BarraDato[] }) {
  const maximo = Math.max(...datos.map((d) => d.valor), 0);

  return (
    <ul className="space-y-3">
      {datos.map((d) => {
        const porcentaje = maximo > 0 ? (d.valor / maximo) * 100 : 0;
        return (
          <li key={d.clave} className="group">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-sm font-medium">
                {d.etiqueta}
              </span>
              {/* El número siempre escrito: es lo que hace legible el gráfico
                  para quien no distingue los colores entre sí. */}
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {d.valor}
                {d.sufijo && (
                  <span className="ml-0.5 text-xs font-normal text-[var(--color-tinta-3)]">
                    {d.sufijo}
                  </span>
                )}
              </span>
            </div>

            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-[width] duration-500 ease-out"
                style={{
                  width: `${Math.max(porcentaje, 1.5)}%`,
                  background: d.color,
                }}
              />
            </div>

            {d.detalle && (
              <p className="mt-1 text-xs text-[var(--color-tinta-3)]">
                {d.detalle}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export type ColumnaDato = {
  clave: string;
  /** Lo que se escribe bajo la columna. */
  etiqueta: string;
  /** Lo que se lee al pasar el mouse o tocar. */
  titulo: string;
  valor: number;
};

/**
 * Columnas para una serie a lo largo del tiempo.
 *
 * Columnas y no línea porque los días son unidades sueltas —cada uno es una
 * jornada de trabajo cerrada— y porque suele haber huecos: una línea entre
 * dos días separados por un fin de semana inventaría una pendiente que nadie
 * trabajó.
 */
export function GraficoColumnas({
  datos,
  color = "var(--color-serie-1)",
}: {
  datos: ColumnaDato[];
  color?: string;
}) {
  const maximo = Math.max(...datos.map((d) => d.valor), 0);

  return (
    <div>
      <div className="flex h-40 items-end gap-1.5 sm:gap-2">
        {datos.map((d) => {
          const alto = maximo > 0 ? (d.valor / maximo) * 100 : 0;
          return (
            <div
              key={d.clave}
              className="group relative flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
            >
              {/* Aviso al pasar por encima. Se dibuja siempre y se muestra con
                  CSS: sin JavaScript funciona igual en el celular al tocar. */}
              <span
                role="tooltip"
                className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-md bg-[var(--color-tinta)] px-2 py-1 text-xs font-medium text-white shadow-lg group-hover:block group-focus-within:block"
              >
                {d.titulo}
              </span>

              <span className="text-xs font-semibold tabular-nums text-[var(--color-tinta-2)]">
                {d.valor}
              </span>

              <div
                tabIndex={0}
                aria-label={d.titulo}
                className="w-full rounded-t-[4px] outline-none transition-[height,opacity] duration-500 ease-out hover:opacity-80 focus-visible:opacity-80"
                style={{
                  height: `${Math.max(alto, 2)}%`,
                  background: color,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Línea de base: da el piso del que salen las columnas. */}
      <div className="mt-0 h-px bg-[var(--color-borde-fuerte)]" />

      <div className="mt-2 flex gap-1.5 sm:gap-2">
        {datos.map((d) => (
          <div
            key={d.clave}
            className="min-w-0 flex-1 truncate text-center text-[0.6875rem] tabular-nums text-[var(--color-tinta-3)]"
          >
            {d.etiqueta}
          </div>
        ))}
      </div>
    </div>
  );
}
