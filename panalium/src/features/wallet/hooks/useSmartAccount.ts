import { useCallback, useEffect, useState } from "react"

import {
  loadChainConfig,
  loadSmartAccount,
  loadTokenBalance,
  type ChainConfig,
  type SmartAccount,
  type TokenBalance,
} from "../api"

export interface SmartAccountState {
  account: SmartAccount | null

  chain: ChainConfig | null

  tokenBalance: TokenBalance | null

  loading: boolean

  error: string | null

  /** Vuelve a consultar saldos; se llama tras fondear. */

  refresh: () => Promise<void>
}

/**
 * Carga la smart account del usuario y la configuración de la red desde el backend.
 *
 * La dirección es contrafactual: existe aunque el contrato no esté desplegado, así que se puede
 * mostrar y fondear desde el primer momento.
 *
 * Uso interno: las pantallas consumen `useSmartAccount` del provider, que llama a esto una
 * sola vez y comparte el resultado.
 */

export function useSmartAccountData(userId: string | null): SmartAccountState {
  const [account, setAccount] = useState<SmartAccount | null>(null)

  const [chain, setChain] = useState<ChainConfig | null>(null)

  const [tokenBalance, setTokenBalance] = useState<TokenBalance | null>(null)

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    // Sin sesión no hay a quién consultar: limpiamos y salimos sin pedir nada al backend.

    if (!userId) {
      setAccount(null)

      setChain(null)

      setTokenBalance(null)

      setError(null)

      setLoading(false)

      return
    }

    setError(null)

    setLoading(true)

    try {
      const [nextAccount, nextChain] = await Promise.all([
        loadSmartAccount(),
        loadChainConfig(),
      ])

      setAccount(nextAccount)

      setChain(nextChain)

      if (nextChain.token) {
        try {
          setTokenBalance(await loadTokenBalance(nextChain.token.address))
        } catch {
          // Un token mal configurado no debe tumbar la tarjeta: se muestra el saldo nativo.

          setTokenBalance(null)
        }
      } else {
        setTokenBalance(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  return { account, chain, tokenBalance, loading, error, refresh: load }
}
