import type {
  ERC1155Token,
  NFTListing,
  NFTListingStatus,
  TokenStatus,
} from "@/domain"
import type { AppAction } from "../types"

export interface AddTokenAction {
  type: "tokens/add"
  token: ERC1155Token
}

export interface SetTokensAction {
  type: "tokens/setAll"
  tokens: ERC1155Token[]
}

export interface SetTokenStatusAction {
  type: "tokens/setStatus"
  tokenId: string
  status: TokenStatus
}

export interface SetListingsAction {
  type: "listings/setAll"
  listings: NFTListing[]
}

export interface AddListingAction {
  type: "listings/add"
  listing: NFTListing
}

export interface ReplaceListingAction {
  type: "listings/replace"
  listing: NFTListing
}

export interface SetListingStatusAction {
  type: "listings/setStatus"
  listingId: string
  status: NFTListingStatus
}

export type ReceiptsAction = AddTokenAction | SetTokensAction | SetTokenStatusAction | SetListingsAction | AddListingAction | ReplaceListingAction | SetListingStatusAction

export const receiptsActions = {
  addToken: (token: ERC1155Token): ReceiptsAction => ({
    type: "tokens/add",
    token,
  }),
  /** Replaces the user's receipts (ExaKeys loaded from the backend). */
  setTokens: (tokens: ERC1155Token[]): ReceiptsAction => ({
    type: "tokens/setAll",
    tokens,
  }),
  setTokenStatus: (tokenId: string, status: TokenStatus): ReceiptsAction => ({
    type: "tokens/setStatus",
    tokenId,
    status,
  }),
  /** Replaces the market listings (loaded from the backend). */
  setListings: (listings: NFTListing[]): ReceiptsAction => ({
    type: "listings/setAll",
    listings,
  }),
  addListing: (listing: NFTListing): ReceiptsAction => ({
    type: "listings/add",
    listing,
  }),
  replaceListing: (listing: NFTListing): ReceiptsAction => ({
    type: "listings/replace",
    listing,
  }),
  setListingStatus: (
    listingId: string,
    status: NFTListingStatus,
  ): ReceiptsAction => ({ type: "listings/setStatus", listingId, status }),
}

export function tokensReducer(
  state: ERC1155Token[],
  action: AppAction,
): ERC1155Token[] {
  switch (action.type) {
    case "tokens/setAll":
      return action.tokens
    case "tokens/add":
      return [...state, action.token]
    case "tokens/setStatus":
      return state.map((t) =>
        t.id === action.tokenId ? { ...t, status: action.status } : t,
      )
    default:
      return state
  }
}

export function listingsReducer(
  state: NFTListing[],
  action: AppAction,
): NFTListing[] {
  switch (action.type) {
    case "listings/setAll":
      return action.listings
    case "listings/add":
      return [...state, action.listing]
    case "listings/replace":
      return state.map((l) => (l.id === action.listing.id ? action.listing : l))
    case "listings/setStatus":
      return state.map((l) =>
        l.id === action.listingId ? { ...l, listingStatus: action.status } : l,
      )
    default:
      return state
  }
}
