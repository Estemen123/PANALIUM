import type { Currency, ISODate } from "@/domain/common/types"

export type GroupType = "local" | "international"
export type GroupStatus = "open" | "funded" | "paid_to_supplier" | "closed" | "cancelled"

/** Enjambre: subgrupo de Abejas dentro de un Panal, ligado a un punto de retiro. */
export interface Swarm {
  id: string
  name: string
  pickupPoint: string
  /** Celdas máximas que admite el Enjambre. */
  capacity: number
}

export interface GroupMember {
  userId: string
  userName: string
  swarmId: string
  units: number
  paid: number
  currency: Currency
  joinedAt: ISODate
}

export interface BuyingGroup {
  id: string
  type: GroupType
  creatorId: string
  creatorName: string
  productName: string
  description?: string
  productId?: string
  productLink?: string
  imageUrl?: string
  supplierName?: string
  targetUnits: number
  currentUnits: number
  unitPrice: number
  currency: Currency
  entryDeposit: number
  minUnits: number
  swarms: Swarm[]
  members: GroupMember[]
  status: GroupStatus
  category?: string
  createdAt: ISODate
  deadline?: ISODate
  /** Fecha estimada de llegada (Panales de importación). */
  eta?: ISODate
  /** Tx de crearPanal en el contrato EscrowPanales. */
  txHash?: string
  explorerUrl?: string
}

export interface CreateGroupInput {
  type: GroupType
  productName: string
  description: string
  imageUrl?: string
  /** Foto que se sube al backend junto con el Panal. */
  photo?: File | null
  productId?: string
  productLink?: string
  supplierName?: string
  pickupPoint: string
  targetUnits: number
  unitPrice: number
  currency: Currency
  entryDeposit: number
  category: string
  deadline?: ISODate
  /** Celdas que reserva el fundador; paga el adelanto al fundar. */
  reserveUnits: number
}

export interface JoinGroupInput {
  swarmId: string
  units: number
  currency: Currency
}
