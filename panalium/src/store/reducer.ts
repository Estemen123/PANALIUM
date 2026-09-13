import type { AppAction, AppState } from "./types"
import { usersReducer } from "./slices/users"
import { productsReducer } from "./slices/products"
import { groupsReducer } from "./slices/groups"
import { listingsReducer, tokensReducer } from "./slices/receipts"

/** Root reducer: each slice handles its own actions and ignores the rest. */
export function appReducer(state: AppState, action: AppAction): AppState {
  return {
    users: usersReducer(state.users, action),
    products: productsReducer(state.products, action),
    groups: groupsReducer(state.groups, action),
    tokens: tokensReducer(state.tokens, action),
    listings: listingsReducer(state.listings, action),
  }
}
