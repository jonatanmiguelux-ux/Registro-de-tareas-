import { randomInt } from "node:crypto";
import type { TipoFalla } from "@prisma/client";

/**
 * Piezas del reclamo que carga un vecino.
 *
 * Está separado del resto del proyecto a propósito: esta parte la usa gente
 * de la calle, sin cuenta y desde internet abierta, mientras que todo lo demás
 * asume que del otro lado hay un empleado con sesión iniciada.
 */

/** Las tres fallas que puede reportar un vecino, como se ven en pantalla. */
export const TIPOS_FALLA: { valor: TipoFalla; etiqueta: string; ayuda: string }[] =
  [
    {
      valor: "NO_FUNCIONA",
      etiqueta: "No funciona",
      ayuda: "La luminaria no enciende de noche.",
    },
    {
      valor: "ENCENDIDA",
      etiqueta: "Encendida de día",
      ayuda: "Queda prendida cuando hay luz natural.",
    },
    {
      valor: "INTERMITENTE",
      etiqueta: "Intermitente",
      ayuda: "Prende y apaga sola.",
    },
  ];

export function etiquetaDeFalla(tipo: TipoFalla): string {
  return TIPOS_FALLA.find((t) => t.valor === tipo)?.etiqueta ?? String(tipo);
}

/**
 * Código de seguimiento que se le da al vecino.
 *
 * Sin vocales ni caracteres que se confundan al dictarlo por teléfono (0/O,
 * 1/I/L): esto se lee en voz alta en una delegación.
 */
const ALFABETO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function generarCodigoSeguimiento(): string {
  let codigo = "";
  for (let i = 0; i < 8; i++) {
    codigo += ALFABETO[randomInt(ALFABETO.length)];
  }
  return `${codigo.slice(0, 4)}-${codigo.slice(4)}`;
}

/**
 * Normaliza el correo de contacto para guardarlo.
 *
 * Sólo minúsculas y sin espacios: no se tocan los puntos ni los alias con `+`,
 * porque en algunos servidores son direcciones distintas de verdad.
 */
export function normalizarCorreo(valor: string): string {
  return valor.trim().toLowerCase();
}

export function correoValido(valor: string): boolean {
  // Deliberadamente simple: la comprobación de verdad es que llegue el código.
  // Una expresión regular estricta rechaza direcciones válidas y raras, y no
  // aporta nada que el envío no resuelva mejor.
  const v = normalizarCorreo(valor);
  return v.length >= 5 && v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
