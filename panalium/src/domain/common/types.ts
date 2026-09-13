/** USDC es la moneda de la plataforma; BS es el token de recompensa. */
export type Currency = "USDC" | "BS"

export const CURRENCIES: Currency[] = ["USDC", "BS"]

export const CURRENCY_LABELS: Record<Currency, string> = {
  USDC: "USDC",
  BS: "BS Token",
}

/** ISO date string `YYYY-MM-DD`. */
export type ISODate = string
