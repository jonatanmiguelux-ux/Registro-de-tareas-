/**
 * Convierte a Date lo que haya escrito en el papel.
 *
 * Acepta AAAA-MM-DD (lo que pedimos a la IA) y también DD/MM/AAAA y DD-MM-AA,
 * porque un corrector humano va a tipear como se escribe acá.
 * Devuelve null ante cualquier cosa que no sea una fecha real: preferimos un
 * campo vacío a una fecha inventada.
 */
export function parsearFecha(valor: string | null | undefined): Date | null {
  if (!valor) return null;
  const texto = valor.trim();
  if (!texto) return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  if (iso) {
    return construir(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  const local = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/.exec(texto);
  if (local) {
    const anio = Number(local[3]);
    return construir(
      anio < 100 ? 2000 + anio : anio,
      Number(local[2]),
      Number(local[1]),
    );
  }

  return null;
}

function construir(anio: number, mes: number, dia: number): Date | null {
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  // Rebota los días que no existen: el 31/02 se desborda a marzo.
  if (fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia) return null;
  return fecha;
}

/**
 * Formatea una fecha del calendario (la del papel) como DD/MM/AAAA.
 *
 * Lee en UTC a propósito: estas fechas se guardan como medianoche UTC, así que
 * leerlas en horario local las correría un día para atrás en Argentina.
 */
export function formatearFecha(fecha: Date | string | null): string {
  if (!fecha) return "";
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(
    d.getUTCMonth() + 1,
  ).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

/**
 * Formatea un instante real (cuándo se cargó algo) en horario local.
 *
 * A diferencia de la anterior, acá sí importa la hora del usuario: una carga
 * de las 21:30 en Argentina es UTC del día siguiente, y mostrarla como mañana
 * confundiría a quien busca lo que cargó recién.
 */
export function formatearMomento(fecha: Date | string | null): string {
  if (!fecha) return "";
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1,
  ).padStart(2, "0")}/${d.getFullYear()}`;
}

/** Formatea para un <input type="date">, que siempre espera AAAA-MM-DD. */
export function paraInputDate(fecha: Date | string | null): string {
  if (!fecha) return "";
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}
