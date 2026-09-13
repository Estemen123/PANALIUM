import type { Transaction, TransactionType } from "./types"
import { COLORS } from "@/shared/config/theme"

export function isIncoming(tx: Transaction): boolean {
  return tx.amount > 0
}

export interface TransactionMeta {
  glyph: string
  color: string
}

export const TRANSACTION_META: Record<TransactionType, TransactionMeta> = {
  deposit: { glyph: "↓", color: COLORS.olive },
  group: { glyph: "↑", color: COLORS.honey },
  reward: { glyph: "★", color: COLORS.honeyLight },
}
