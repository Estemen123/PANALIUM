import { useCallback, useMemo } from "react"
import {
  canJoinSwarm,
  createBuyingGroup,
  createGroupMember,
  groupsForUser,
  withNewMember,
  type BuyingGroup,
  type CreateGroupInput,
  type JoinGroupInput,
} from "@/domain"
import { groupsActions, useAppDispatch, useAppState } from "@/store"
import { useCurrentUser } from "@/features/auth"
import { fail, ok, type ActionResult } from "@/shared/lib/result"

export function useGroups(): BuyingGroup[] {
  return useAppState().groups
}

/** Panales que la Abeja fundó o donde participa. */
export function useMyGroups(): BuyingGroup[] {
  const user = useCurrentUser()
  const { groups } = useAppState()
  return useMemo(() => groupsForUser(groups, user.id), [groups, user.id])
}

export function useGroupActions() {
  const user = useCurrentUser()
  const dispatch = useAppDispatch()

  const createGroup = useCallback(
    (input: CreateGroupInput) => {
      const group = createBuyingGroup(input, user)
      dispatch(groupsActions.add(group))
      return group
    },
    [dispatch, user],
  )

  const joinGroup = useCallback(
    (group: BuyingGroup, input: JoinGroupInput): ActionResult => {
      const cost = input.units * group.unitPrice
      if (input.currency === "USDC" && cost > user.wallet.usdc) {
        return fail(
          `No tienes suficiente USDC en tu reserva. Te faltan ${(cost - user.wallet.usdc).toFixed(2)} USDC.`,
        )
      }
      if (!canJoinSwarm(group, input.swarmId, input.units)) {
        return fail(
          "Este Enjambre no tiene espacio para tantas celdas. Elige otro punto de retiro o menos celdas.",
        )
      }
      const member = createGroupMember(group, user, input)
      dispatch(groupsActions.replace(withNewMember(group, member)))
      return ok
    },
    [dispatch, user],
  )

  return { createGroup, joinGroup }
}
