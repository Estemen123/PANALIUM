import type { ERC1155Token, NFTListing, SellReceiptInput } from "./types"
import type { User } from "@/domain/user/types"
import { generateId } from "@/shared/lib/id"
import { today } from "@/shared/lib/date"

export function createListing(
  token: ERC1155Token,
  seller: User,
  input: SellReceiptInput,
): NFTListing {
  return {
    id: generateId("lst"),
    tokenId: token.tokenId,
    groupId: token.groupId,
    groupName: token.groupName,
    productImage: token.productImage,
    sellerId: seller.id,
    sellerName: seller.name,
    amount: input.amount,
    askPrice: input.askPrice,
    askCurrency: input.askCurrency,
    listingStatus: "active",
    createdAt: today(),
    supplierETA: token.supplierETA,
    initialAmount: input.amount,
    originalUnitPrice: token.unitPrice ?? null,
    offers: [],
    offersCount: 0,
    bestOfferPrice: null,
  }
}

/** Mints a token for the buyer of `units` from a listing. */
export function mintTokenFromListing(
  listing: NFTListing,
  buyer: User,
  units: number,
): ERC1155Token {
  return {
    id: generateId("tok"),
    tokenId: listing.tokenId,
    groupId: listing.groupId,
    groupName: listing.groupName,
    productImage: listing.productImage,
    ownerId: buyer.id,
    amount: units,
    mintedAt: today(),
    status: "held",
    supplierETA: listing.supplierETA,
  }
}

/** Listing after selling `units`: sold out or reduced. */
export function listingAfterPurchase(
  listing: NFTListing,
  units: number,
): NFTListing {
  return units >= listing.amount
    ? { ...listing, listingStatus: "sold" }
    : { ...listing, amount: listing.amount - units }
}
