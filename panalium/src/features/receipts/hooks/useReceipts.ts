import { useCallback, useMemo } from "react"
import {
  createListing,
  tokensForOwner,
  type ERC1155Token,
  type SellReceiptInput,
} from "@/domain"
import { receiptsActions, useAppDispatch, useAppState } from "@/store"
import { useCurrentUser } from "@/features/auth"
import { fail, ok, type ActionResult } from "@/shared/lib/result"

export type { ActionResult } from "@/shared/lib/result"

/** ERC-1155 receipts owned by the signed-in user. */
export function useMyTokens(): ERC1155Token[] {
  const user = useCurrentUser()
  const { tokens } = useAppState()
  return useMemo(() => tokensForOwner(tokens, user.id), [tokens, user.id])
}

export function useReceiptActions() {
  const user = useCurrentUser()
  const dispatch = useAppDispatch()

  const sellToken = useCallback(
    (token: ERC1155Token, input: SellReceiptInput): ActionResult => {
      if (input.amount > token.amount)
        return fail(`Solo tienes ${token.amount} celdas en esta Hexakey.`)
      dispatch(receiptsActions.addListing(createListing(token, user, input)))
      dispatch(receiptsActions.setTokenStatus(token.id, "listed"))
      return ok
    },
    [dispatch, user],
  )

  const burnToken = useCallback(
    (token: ERC1155Token) => {
      dispatch(receiptsActions.setTokenStatus(token.id, "burned"))
    },
    [dispatch],
  )

  return { sellToken, burnToken }
}
