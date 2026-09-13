import { useCallback, useMemo } from "react"
import {
  tokensForOwner,
  type ERC1155Token,
  type SellReceiptInput,
} from "@/domain"
import { receiptsActions, useAppDispatch, useAppState } from "@/store"
import { useCurrentUser } from "@/features/auth"
import { useListingActions } from "@/features/nft-market"
import { fail, type ActionResult } from "@/shared/lib/result"

export type { ActionResult } from "@/shared/lib/result"

/** ERC-1155 receipts owned by the signed-in user. */
export function useMyTokens(): ERC1155Token[] {
  const user = useCurrentUser()
  const { tokens } = useAppState()
  return useMemo(() => tokensForOwner(tokens, user.id), [tokens, user.id])
}

export function useReceiptActions() {
  const dispatch = useAppDispatch()
  const { publish } = useListingActions()

  /** Publica celdas de la Hexakey en el Mercado de Abejas (Firestore `mercado`). */
  const sellToken = useCallback(
    (token: ERC1155Token, input: SellReceiptInput): Promise<ActionResult> => {
      if (input.amount > token.amount)
        return Promise.resolve(fail(`Solo tienes ${token.amount} celdas en esta Hexakey.`))
      if (!(input.askPrice > 0))
        return Promise.resolve(fail("El precio por celda debe ser mayor a 0."))
      return publish({ tokenId: token.tokenId, amount: input.amount, askPrice: input.askPrice })
    },
    [publish],
  )

  const burnToken = useCallback(
    (token: ERC1155Token) => {
      dispatch(receiptsActions.setTokenStatus(token.id, "burned"))
    },
    [dispatch],
  )

  return { sellToken, burnToken }
}
