import { useCallback, useEffect, useMemo, useState } from "react"
import {
  activeListings,
  type MakeOfferInput,
  type MarketSale,
  type NFTListing,
} from "@/domain"
import { receiptsActions, useAppDispatch, useAppState } from "@/store"
import { loadExaKeysFromBackend } from "@/features/receipts/api"
import { fail, ok, type ActionResult } from "@/shared/lib/result"
import {
  acceptOfferOnBackend,
  buyListingOnBackend,
  cancelListingOnBackend,
  loadMarketFromBackend,
  makeOfferOnBackend,
  publishListingOnBackend,
  rejectOfferOnBackend,
  withdrawOfferOnBackend,
  type MarketSnapshot,
  type PublishListingInput,
} from "../api"

export type { ActionResult } from "@/shared/lib/result"

export function useActiveListings(): NFTListing[] {
  const { listings } = useAppState()
  return useMemo(() => activeListings(listings), [listings])
}

// Últimas ventas: compartidas entre montajes de la página para no parpadear al volver.
let salesCache: MarketSale[] = []
const salesListeners = new Set<(sales: MarketSale[]) => void>()

function publishSales(sales: MarketSale[]) {
  salesCache = sales
  for (const listener of salesListeners) listener(sales)
}

/**
 * Aplica un Mercado recién leído al store y recarga las Hexakeys del usuario:
 * cada compra, venta o publicación cambia quién es dueño de qué.
 */
function useApplySnapshot() {
  const dispatch = useAppDispatch()
  return useCallback(
    async (snapshot: MarketSnapshot) => {
      dispatch(receiptsActions.setListings(snapshot.listings))
      publishSales(snapshot.sales)
      try {
        dispatch(receiptsActions.setTokens(await loadExaKeysFromBackend()))
      } catch (err) {
        console.warn("No se pudieron recargar las Hexakeys", err)
      }
    },
    [dispatch],
  )
}

/** Recarga el Mercado al montar y expone las últimas ventas. */
export function useMarketData() {
  const apply = useApplySnapshot()
  const [sales, setSales] = useState<MarketSale[]>(salesCache)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    salesListeners.add(setSales)
    return () => {
      salesListeners.delete(setSales)
    }
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await apply(await loadMarketFromBackend())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [apply])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { sales, loading, error, refresh }
}

/** Todas las operaciones del Mercado: van al backend y refrescan Mercado + Hexakeys. */
export function useListingActions() {
  const apply = useApplySnapshot()

  const run = useCallback(
    async (call: () => Promise<MarketSnapshot>): Promise<ActionResult> => {
      try {
        await apply(await call())
        return ok
      } catch (err) {
        return fail(err instanceof Error ? err.message : String(err))
      }
    },
    [apply],
  )

  return useMemo(
    () => ({
      publish: (input: PublishListingInput) => run(() => publishListingOnBackend(input)),
      buyListing: (listing: NFTListing, units: number) => {
        if (units > listing.amount)
          return Promise.resolve(fail(`Solo quedan ${listing.amount} celdas disponibles en esta oferta.`))
        return run(() => buyListingOnBackend(listing.id, units))
      },
      cancelListing: (listing: NFTListing) => run(() => cancelListingOnBackend(listing.id)),
      makeOffer: (listing: NFTListing, input: MakeOfferInput) =>
        run(() => makeOfferOnBackend(listing.id, input)),
      acceptOffer: (listing: NFTListing, offerId: string) =>
        run(() => acceptOfferOnBackend(listing.id, offerId)),
      rejectOffer: (listing: NFTListing, offerId: string) =>
        run(() => rejectOfferOnBackend(listing.id, offerId)),
      withdrawOffer: (listing: NFTListing, offerId: string) =>
        run(() => withdrawOfferOnBackend(listing.id, offerId)),
    }),
    [run],
  )
}
