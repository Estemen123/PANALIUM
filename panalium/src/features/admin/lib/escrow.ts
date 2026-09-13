import type { BadgeVariant } from "@/shared/ui"

const USDC_DECIMALS = 6

/** Unidades mínimas de USDC (string del contrato) a número. */
export function rawToUsdc(raw: string): number {
  return Number(raw) / 10 ** USDC_DECIMALS
}

export function shortAddress(address: string | null | undefined): string {
  if (!address) return "—"
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

export const ESTADOS = {
  RESERVANDO: 0,
  COTIZANDO: 1,
  RECOLECTANDO: 2,
  LIBERADO: 3,
  SELLADO: 4,
  CANCELADO: 5,
} as const

export interface EstadoMeta {
  label: string
  variant: BadgeVariant
}

export const ESTADO_META: Record<number, EstadoMeta> = {
  0: { label: "0 · Reservando", variant: "light" },
  1: { label: "1 · Cotizando", variant: "dark" },
  2: { label: "2 · Recolectando", variant: "primary" },
  3: { label: "3 · Liberado", variant: "success" },
  4: { label: "4 · Sellado", variant: "neutral" },
  5: { label: "5 · Cancelado", variant: "outline" },
}

export function formatUnix(seconds: number): string {
  if (!seconds) return "—"
  return new Date(seconds * 1000).toLocaleString("es-VE", {
    dateStyle: "short",
    timeStyle: "short",
  })
}
