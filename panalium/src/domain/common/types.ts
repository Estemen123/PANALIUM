/** USDT es la moneda de la plataforma; BS es el token de recompensa. */
export type Currency = "USDT" | "BS"

export const CURRENCIES: Currency[] = ["USDT", "BS"]

export const CURRENCY_LABELS: Record<Currency, string> = {
  USDT: "USDT",
  BS: "BS Token",
}

/** ISO date string `YYYY-MM-DD`. */
export type ISODate = string
