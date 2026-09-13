import { useCallback, useMemo } from "react"
import {
  activeListings,
  listingAfterPurchase,
  mintTokenFromListing,
  type NFTListing,
} from "@/domain"
import { receiptsActions, useAppDispatch, useAppState } from "@/store"
import { useCurrentUser } from "@/features/auth"
import { fail, ok, type ActionResult } from "@/shared/lib/result"

export type { ActionResult } from "@/shared/lib/result"

export function useActiveListings(): NFTListing[] {
  const { listings } = useAppState()
  return useMemo(() => activeListings(listings), [listings])
}

export function useListingActions() {
  const user = useCurrentUser()
  const dispatch = useAppDispatch()

  /** Mints a receipt for the buyer and reduces or closes the listing. */
  const buyListing = useCallback(
    (listing: NFTListing, units: number): ActionResult => {
      if (units > listing.amount)
        return fail(
          `Solo quedan ${listing.amount} celdas disponibles en esta oferta.`,
        )
      dispatch(
        receiptsActions.addToken(mintTokenFromListing(listing, user, units)),
      )
      dispatch(
        receiptsActions.replaceListing(listingAfterPurchase(listing, units)),
      )
      return ok
    },
    [dispatch, user],
  )

  const cancelListing = useCallback(
    (listingId: string) => {
      dispatch(receiptsActions.setListingStatus(listingId, "cancelled"))
    },
    [dispatch],
  )

  return { buyListing, cancelListing }
}
