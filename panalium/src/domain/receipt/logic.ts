import type { ERC1155Token, NFTListing, TokenStatus } from "./types"
import { COLORS } from "@/shared/config/theme"

export function tokensForOwner(
  tokens: ERC1155Token[],
  ownerId: string,
): ERC1155Token[] {
  return tokens.filter((t) => t.ownerId === ownerId)
}

export function activeListings(listings: NFTListing[]): NFTListing[] {
  return listings.filter((l) => l.listingStatus === "active")
}

export function isOwnListing(listing: NFTListing, userId: string): boolean {
  return listing.sellerId === userId
}

export function canSellToken(token: ERC1155Token): boolean {
  return token.status === "held"
}

export function canBurnToken(token: ERC1155Token): boolean {
  return token.status !== "burned"
}

export interface TokenStatusMeta {
  label: string
  bg: string
  fg: string
}

/** Etiquetas de estado de una Hexakey. */
export const TOKEN_STATUS_META: Record<TokenStatus, TokenStatusMeta> = {
  held: { label: "En custodia", bg: COLORS.beige, fg: COLORS.brown },
  listed: { label: "En venta", bg: COLORS.brown, fg: COLORS.cream },
  burned: { label: "Reclamada", bg: COLORS.olive, fg: COLORS.cream },
}

export function countByStatus(
  tokens: ERC1155Token[],
): Record<TokenStatus, number> {
  const counts: Record<TokenStatus, number> = { held: 0, listed: 0, burned: 0 }
  for (const t of tokens) counts[t.status] += 1
  return counts
}
