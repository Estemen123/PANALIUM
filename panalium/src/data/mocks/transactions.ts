import type { Transaction } from "@/domain"

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: "t1",
    type: "deposit",
    label: "Depósito de USDT",
    amount: 500,
    currency: "USDT",
    date: "2026-09-03",
  },
  {
    id: "t2",
    type: "group",
    label: "Panal: Aceite de Oliva",
    amount: -135,
    currency: "USDT",
    date: "2026-08-26",
  },
  {
    id: "t3",
    type: "group",
    label: "Panal: Papel Higiénico",
    amount: -240,
    currency: "USDT",
    date: "2026-08-25",
  },
  {
    id: "t4",
    type: "reward",
    label: "Recompensa de la colmena",
    amount: 1500,
    currency: "BS",
    date: "2026-08-21",
  },
  {
    id: "t5",
    type: "group",
    label: "Panal: Auriculares Bluetooth",
    amount: -340,
    currency: "USDT",
    date: "2026-08-22",
  },
]
