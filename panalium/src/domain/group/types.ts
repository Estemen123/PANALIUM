import type { Currency, ISODate } from "@/domain/common/types"

export type GroupType = "local" | "international"
export type GroupStatus = "open" | "funded" | "negotiating" | "collecting" | "paid_to_supplier" | "closed" | "cancelled"

/** Etapa del Panal en el contrato EscrowPanales (la guarda el backend en Firestore). */
export type PanalStage = "reservando" | "negociando" | "cobrando" | "liberado" | "sellado" | "cancelado"

/** Desglose del precio real negociado con el proveedor. */
export interface PanalQuote {
  unidades: number
  precioProveedorUnidad: number
  envioTotal: number
  otrosCostos: number
  gananciaPorcentaje: number
  productoTotal: number
  costoTotal: number
  envioPorUnidad: number
  costoPorUnidad: number
  comisionPorUnidad: number
  comisionTotal: number
  precioFinalUnidad: number
  totalFinal: number
  precioEstimadoUnidad: number
  precioMinimoPermitido: number
  valida: boolean
  horasCobro: number
  abejas?: PanalQuoteBee[]
}

export interface PanalQuoteBee {
  uid: string
  name: string
  unidades: number
  pagado: number
  total: number
  restante: number
}

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
  /** Ya pagó el total de sus celdas al precio final. */
  paidComplete?: boolean
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
  stage?: PanalStage
  /** Celdas que ya pagaron el total. */
  paidUnits?: number
  /** Precio real por celda tras la negociación (incluye envío y comisión). */
  finalUnitPrice?: number
  quote?: PanalQuote
  /** Fin del plazo para pagar el restante (ISO). */
  collectionEndsAt?: string
  /** El cobro venció sin el mínimo pagado: el admin debe extender o cancelar. */
  collectionExpired?: boolean
  /** Token id de ExaKey1155 en HashKey, cuando el Panal está sellado. */
  tokenId?: number
  exakeysExplorerUrl?: string
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
