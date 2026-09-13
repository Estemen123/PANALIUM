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
}

export interface SellReceiptInput {
  amount: number
  askPrice: number
  askCurrency: Currency
}
