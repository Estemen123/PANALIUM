import type { AppState } from "./types"
import { MOCK_PRODUCTS, MOCK_USERS } from "@/data/mocks"

/** Seed state. Swap this for an API-backed loader when a backend exists. */
export function createInitialState(): AppState {
  return {
    users: MOCK_USERS,
    products: MOCK_PRODUCTS,
    // Los Panales llegan de GET /api/panales al iniciar sesión.
    groups: [],
    // Las Hexakeys (ExaKeys) llegan de GET /api/exakeys al iniciar sesión.
    tokens: [],
    // El Mercado de Abejas llega de GET /api/mercado (Firestore `mercado`).
    listings: [],
  }
}
