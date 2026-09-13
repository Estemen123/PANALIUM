import type { Currency, ISODate } from "@/domain/common/types"

export type TokenStatus = "held" | "listed" | "burned"

/**
 * ERC-1155 receipt token minted when a group payment is sent to the supplier.
 * `tokenId` maps to the group id; each holder has `amount` units coming.
 */
export interface ERC1155Token {
  id: string
  tokenId: string
  groupId: string
  groupName: string
  productImage: string
  ownerId: string
  amount: number
  mintedAt: ISODate
  status: TokenStatus
  supplierETA: ISODate
  /** Publicación del Mercado de Abejas que reserva estas unidades, si están en venta. */
  listingId?: string
  /** Precio final por celda que se pagó en el Panal. */
  unitPrice?: number
}

export type NFTListingStatus = "active" | "sold" | "cancelled"

/** Secondary-market listing of an ERC-1155 receipt. */
export interface NFTListing {
  id: string
  tokenId: string
  groupId: string
  groupName: string
  productImage: string
  sellerId: string
  sellerName: string
  amount: number
  askPrice: number
  askCurrency: Currency
  listingStatus: NFTListingStatus
  createdAt: ISODate
  supplierETA: ISODate
  /** Celdas con las que se publicó (`amount` son las que quedan). */
  initialAmount: number
  /** Precio por celda pagado en el Panal, de referencia. */
  originalUnitPrice: number | null
  /** Ofertas pendientes visibles: todas para el vendedor, solo las propias para el resto. */
  offers: MarketOffer[]
  offersCount: number
  bestOfferPrice: number | null
}

export type MarketOfferStatus = "pending" | "accepted" | "rejected" | "withdrawn" | "closed"

/** Oferta de una Abeja por celdas de una publicación, a su propio precio. */
export interface MarketOffer {
  id: string
  listingId: string
  buyerId: string
  buyerName: string
  amount: number
  price: number
  status: MarketOfferStatus
  createdAt: ISODate
}

/** Traspaso registrado en el Mercado (compra directa u oferta aceptada). */
export interface MarketSale {
  id: string
  listingId: string
  groupName: string
  tokenId: string
  sellerName: string
  buyerName: string
  units: number
  price: number
  total: number
  via: "compra" | "oferta"
  createdAt: ISODate
}

export interface MakeOfferInput {
  amount: number
  price: number
}

export interface SellReceiptInput {
  amount: number
  askPrice: number
  askCurrency: Currency
}
