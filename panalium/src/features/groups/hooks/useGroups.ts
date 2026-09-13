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
  cancelPanalOnBackend,
  createPanalOnBackend,
  extendCollectionOnBackend,
  increasePanalOnBackend,
  joinPanalOnBackend,
  loadPanalConfig,
  loadPanalesFromBackend,
  openCollectionOnBackend,
  payRemainingOnBackend,
  refundPanalOnBackend,
  sealPanalOnBackend,
  startNegotiationOnBackend,
  type PanalConfig,
  type QuoteInput,
} from "../api"

/** Valores por defecto mientras llega la configuración real del backend. */
const DEFAULT_CONFIG: PanalConfig = {
  advancePercent: 40,
  contractAddress: "",
  collectionHours: 48,
  defaultProfitPercent: 10,
}
let configCache: PanalConfig | null = null

export function useGroups(): BuyingGroup[] {
  return useAppState().groups
}

/** Panales que la Abeja fundó o donde participa. */
export function useMyGroups(): BuyingGroup[] {
  const user = useCurrentUser()
  const { groups } = useAppState()
  return useMemo(() => groupsForUser(groups, user.id), [groups, user.id])
}

/** Parámetros del contrato y del ciclo de vida (adelanto, horas de cobro, ganancia sugerida). */
export function usePanalConfig(): PanalConfig {
  const [config, setConfig] = useState(configCache ?? DEFAULT_CONFIG)
  useEffect(() => {
    if (configCache !== null) return
    loadPanalConfig()
      .then((loaded) => {
        configCache = loaded
        setConfig(loaded)
      })
      .catch(() => {})
  }, [])
  return config
}

/** Porcentaje del total que se paga al reservar celdas (PORCENTAJE_ADELANTO del contrato). */
export function useAdvancePercent(): number {
  return usePanalConfig().advancePercent
}

/** Envuelve una llamada al backend que devuelve el Panal actualizado. */
function useGroupMutation() {
  const dispatch = useAppDispatch()
  const { refresh: refreshBalance } = useSmartAccount()
  return useCallback(
    async (run: () => Promise<BuyingGroup>): Promise<ActionResult> => {
      try {
        dispatch(groupsActions.replace(await run()))
        void refreshBalance()
        return ok
      } catch (err) {
        return fail(err instanceof Error ? err.message : String(err))
      }
    },
    [dispatch, refreshBalance],
  )
}

export function useGroupActions() {
  const dispatch = useAppDispatch()
  const { refresh: refreshBalance } = useSmartAccount()
  const mutate = useGroupMutation()

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

  /** Reservando: paga el adelanto. Cobrando: entra pagando el total. */
  const joinGroup = useCallback(
    (group: BuyingGroup, input: JoinGroupInput): Promise<ActionResult> => {
      if (!canJoinSwarm(group, input.swarmId, input.units)) {
        return Promise.resolve(
          fail("No quedan tantas celdas libres. Elige menos celdas."),
        )
      }
      return mutate(() => joinPanalOnBackend(group.id, input.units))
    },
    [mutate],
  )

  const increaseParticipation = useCallback(
    (group: BuyingGroup, units: number) =>
      mutate(() => increasePanalOnBackend(group.id, units)),
    [mutate],
  )

  const payRemaining = useCallback(
    (group: BuyingGroup) => mutate(() => payRemainingOnBackend(group.id)),
    [mutate],
  )

  const refund = useCallback(
    (group: BuyingGroup) => mutate(() => refundPanalOnBackend(group.id)),
    [mutate],
  )

  return {
    createGroup,
    joinGroup,
    increaseParticipation,
    payRemaining,
    refund,
    reloadGroups,
  }
}

/** Transiciones de etapa que ejecuta el admin con la wallet master. */
export function useAdminPanalActions() {
  const mutate = useGroupMutation()
  return {
    startNegotiation: (group: BuyingGroup) =>
      mutate(() => startNegotiationOnBackend(group.id)),
    openCollection: (group: BuyingGroup, input: QuoteInput) =>
      mutate(() => openCollectionOnBackend(group.id, input)),
    extendCollection: (group: BuyingGroup, hours: number) =>
      mutate(() => extendCollectionOnBackend(group.id, hours)),
    seal: (group: BuyingGroup) => mutate(() => sealPanalOnBackend(group.id)),
    cancel: (group: BuyingGroup) =>
      mutate(() => cancelPanalOnBackend(group.id)),
  }
}
