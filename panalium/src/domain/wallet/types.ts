import type { Currency, ISODate } from "@/domain/common/types"

export interface Wallet {
  /** Reserva de USDT. */
  usdt: number
  /** Tokens de recompensa BS. */
  bs: number
  address: string
}

export type TransactionType = "deposit" | "group" | "reward"

export interface Transaction {
  id: string
  type: TransactionType
  label: string
  /** Monto con signo; positivo = entrada. */
  amount: number
  currency: Currency
  date: ISODate
}
