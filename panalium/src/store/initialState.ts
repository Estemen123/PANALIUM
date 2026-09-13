import type { AppState } from "./types"
import {
  MOCK_GROUPS,
  MOCK_LISTINGS,
  MOCK_PRODUCTS,
  MOCK_TOKENS,
  MOCK_USERS,
} from "@/data/mocks"

/** Seed state. Swap this for an API-backed loader when a backend exists. */
export function createInitialState(): AppState {
  return {
    users: MOCK_USERS,
    products: MOCK_PRODUCTS,
    groups: MOCK_GROUPS,
    tokens: MOCK_TOKENS,
    listings: MOCK_LISTINGS,
  }
}
