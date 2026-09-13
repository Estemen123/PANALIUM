import type { Currency } from "@/domain/common/types"

const LOCALE = "es-VE"

function decimalsFor(currency: Currency): number {
  return currency === "USDT" ? 2 : 0
}

/** Solo la cifra: `4,50` / `88.000` */
export function formatPrice(
  value: number,
  currency: Currency,
  fractionDigits?: number,
): string {
  const digits = fractionDigits ?? decimalsFor(currency)
  return value.toLocaleString(LOCALE, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

/** Cifra con unidad: `4,50 USDT` / `88.000 BS` */
export function formatAmount(
  value: number,
  currency: Currency,
  fractionDigits?: number,
): string {
  return `${formatPrice(value, currency, fractionDigits)} ${currency}`
}

/** Atajo para USDT: `2.450,00 USDT` */
export function formatUsdt(value: number): string {
  return formatAmount(value, "USDT")
}

/** Dirección abreviada: `0x3a4b5c6d…1a2b` */
export function shortAddress(address: string, head = 6, tail = 4): string {
  return `${address.slice(0, head)}…${address.slice(-tail)}`
}
