import { useCallback, useEffect, useMemo, useState } from "react"
import {
  canJoinSwarm,
  groupsForUser,
  type BuyingGroup,
  type CreateGroupInput,
  type JoinGroupInput,
} from "@/domain"
import { groupsActions, useAppDispatch, useAppState } from "@/store"
import { useCurrentUser } from "@/features/auth"
import { useSmartAccount } from "@/features/wallet"
import { fail, ok, type ActionResult } from "@/shared/lib/result"
import {
  createPanalOnBackend,
  joinPanalOnBackend,
  loadPanalConfig,
  loadPanalesFromBackend,
} from "../api"

/** Adelanto por defecto mientras llega el valor real del contrato. */
const DEFAULT_ADVANCE_PERCENT = 40
let advancePercentCache: number | null = null

export function useGroups(): BuyingGroup[] {
  return useAppState().groups
}

/** Panales que la Abeja fundó o donde participa. */
export function useMyGroups(): BuyingGroup[] {
  const user = useCurrentUser()
  const { groups } = useAppState()
  return useMemo(() => groupsForUser(groups, user.id), [groups, user.id])
}

/** Porcentaje del total que se paga al reservar celdas (PORCENTAJE_ADELANTO del contrato). */
export function useAdvancePercent(): number {
  const [percent, setPercent] = useState(
    advancePercentCache ?? DEFAULT_ADVANCE_PERCENT,
  )
  useEffect(() => {
    if (advancePercentCache !== null) return
    loadPanalConfig()
      .then((config) => {
        advancePercentCache = config.advancePercent
        setPercent(config.advancePercent)
      })
      .catch(() => {})
  }, [])
  return percent
}

export function useGroupActions() {
  const dispatch = useAppDispatch()
  const { refresh: refreshBalance } = useSmartAccount()

  /** Vuelve a traer los Panales desde Firestore. */
  const reloadGroups = useCallback(async () => {
    dispatch(groupsActions.setAll(await loadPanalesFromBackend()))
  }, [dispatch])

  /** Crea el Panal en el contrato, paga el adelanto del fundador y lo agrega al store. */
  const createGroup = useCallback(
    async (input: CreateGroupInput) => {
      const group = await createPanalOnBackend(input)
      dispatch(groupsActions.add(group))
      void refreshBalance()
      return group
    },
    [dispatch, refreshBalance],
  )

  /** Reserva celdas pagando el adelanto desde la smart account. */
  const joinGroup = useCallback(
    async (
      group: BuyingGroup,
      input: JoinGroupInput,
    ): Promise<ActionResult> => {
      if (!canJoinSwarm(group, input.swarmId, input.units)) {
        return fail(
          "Este Enjambre no tiene espacio para tantas celdas. Elige menos celdas.",
        )
      }
      try {
        dispatch(
          groupsActions.replace(
            await joinPanalOnBackend(group.id, input.units),
          ),
        )
        void refreshBalance()
        return ok
      } catch (err) {
        return fail(err instanceof Error ? err.message : String(err))
      }
    },
    [dispatch, refreshBalance],
  )

  return { createGroup, joinGroup, reloadGroups }
}
