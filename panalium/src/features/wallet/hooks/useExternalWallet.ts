import { useCallback, useEffect, useState } from "react"
import type { ChainConfig } from "../api"

/**
 * Conexión con una wallet externa del navegador (MetaMask, Core, Rabbit...) vía EIP-1193.
 *
 * No usamos librería: el proveedor se expone en `window.ethereum` y todo lo que necesitamos
 * son cuatro llamadas JSON-RPC y un calldata de ERC-20 armado a mano.
 */

interface RequestArgs {
  method: string
  params?: unknown[]
}

interface Eip1193Provider {
  request: (args: RequestArgs) => Promise<unknown>
  on?: (event: string, handler: (...args: any[]) => void) => void
  removeListener?: (event: string, handler: (...args: any[]) => void) => void
  isMetaMask?: boolean
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider
  }
}

/** Error de MetaMask: trae `code` numérico además del mensaje. */
interface ProviderError {
  code?: number
  message?: string
  data?: unknown
}

const USER_REJECTED = 4001
const CHAIN_NOT_ADDED = 4902

function getProvider(): Eip1193Provider | null {
  return typeof window !== "undefined" && window.ethereum
    ? window.ethereum
    : null
}

/**
 * Convierte un monto decimal escrito por una persona ("12,50") a la unidad entera del token.
 * Se hace con BigInt y no con floats: 0.1 + 0.2 en coma flotante no da 0.3, y aquí mueve dinero.
 */
export function parseUnits(value: string, decimals: number): bigint {
  const normalized = value.trim().replace(",", ".")
  if (
    !/^\d*\.?\d*$/.test(normalized) ||
    normalized === "" ||
    normalized === "."
  ) {
    throw new Error("Monto inválido")
  }
  const [whole = "0", fraction = ""] = normalized.split(".")
  if (fraction.length > decimals) {
    throw new Error(`Máximo ${decimals} decimales`)
  }
  const padded = fraction.padEnd(decimals, "0")
  return BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt(padded || "0")
}

/** Formatea una cantidad entera de unidades como decimal legible. */
export function formatUnits(
  value: bigint,
  decimals: number,
  maxFraction = 4,
): string {
  const base = 10n ** BigInt(decimals)
  const whole = value / base
  const fraction = (value % base)
    .toString()
    .padStart(decimals, "0")
    .slice(0, maxFraction)
  const trimmed = fraction.replace(/0+$/, "")
  return trimmed ? `${whole}.${trimmed}` : whole.toString()
}

/** Calldata de `transfer(address,uint256)`: selector + destino + monto, ambos a 32 bytes. */
export function encodeErc20Transfer(to: string, amount: bigint): string {
  const selector = "a9059cbb"
  const paddedTo = to.toLowerCase().replace(/^0x/, "").padStart(64, "0")
  const paddedAmount = amount.toString(16).padStart(64, "0")
  return `0x${selector}${paddedTo}${paddedAmount}`
}

/** Traduce los errores del proveedor a algo que se pueda mostrar en pantalla. */
function describeProviderError(error: unknown): string {
  const err = error as ProviderError
  if (err?.code === USER_REJECTED)
    return "Cancelaste la operación en tu wallet."
  if (typeof err?.message === "string" && err.message) return err.message
  return "No se pudo completar la operación con tu wallet."
}

export interface ExternalWalletState {
  /** Hay un proveedor inyectado en el navegador. */
  available: boolean
  account: string | null
  chainId: string | null
  connecting: boolean
  error: string | null
  connect: () => Promise<string | null>
  disconnect: () => void
  ensureNetwork: (chain: ChainConfig) => Promise<boolean>
  sendNative: (to: string, amount: string) => Promise<string>
  sendToken: (
    token: string,
    to: string,
    amount: string,
    decimals: number,
  ) => Promise<string>
  clearError: () => void
}

export function useExternalWallet(): ExternalWalletState {
  const [account, setAccount] = useState<string | null>(null)
  const [chainId, setChainId] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const available = Boolean(getProvider())

  // Si la wallet ya estaba autorizada, recuperamos la cuenta sin pedir permiso otra vez.
  useEffect(() => {
    const provider = getProvider()
    if (!provider) return

    let cancelled = false
    void (async () => {
      try {
        const accounts = (await provider.request({
          method: "eth_accounts",
        })) as string[]
        const current = (await provider.request({
          method: "eth_chainId",
        })) as string
        if (cancelled) return
        setAccount(accounts?.[0] ?? null)
        setChainId(current ?? null)
      } catch {
        // Sin permisos todavía: no es un error que mostrar.
      }
    })()

    const onAccountsChanged = (accounts: string[]) =>
      setAccount(accounts?.[0] ?? null)
    const onChainChanged = (id: string) => setChainId(id)
    provider.on?.("accountsChanged", onAccountsChanged)
    provider.on?.("chainChanged", onChainChanged)

    return () => {
      cancelled = true
      provider.removeListener?.("accountsChanged", onAccountsChanged)
      provider.removeListener?.("chainChanged", onChainChanged)
    }
  }, [])

  const connect = useCallback(async () => {
    const provider = getProvider()
    if (!provider) {
      setError(
        "No encontramos una wallet en este navegador. Instala MetaMask para continuar.",
      )
      return null
    }

    setConnecting(true)
    setError(null)
    try {
      const accounts = (await provider.request({
        method: "eth_requestAccounts",
      })) as string[]
      const id = (await provider.request({ method: "eth_chainId" })) as string
      const next = accounts?.[0] ?? null
      setAccount(next)
      setChainId(id ?? null)
      return next
    } catch (err) {
      setError(describeProviderError(err))
      return null
    } finally {
      setConnecting(false)
    }
  }, [])

  /** Olvida la cuenta en esta pantalla. MetaMask sigue autorizado; se revoca desde la extensión. */
  const disconnect = useCallback(() => {
    setAccount(null)
    setError(null)
  }, [])

  /** Pide cambiar a la red del backend y, si la wallet no la conoce, la agrega. */
  const ensureNetwork = useCallback(async (chain: ChainConfig) => {
    const provider = getProvider()
    if (!provider) return false

    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chain.idHex }],
      })
      setChainId(chain.idHex)
      return true
    } catch (err) {
      const code = (err as ProviderError)?.code
      if (code !== CHAIN_NOT_ADDED) {
        setError(describeProviderError(err))
        return false
      }
      try {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: chain.idHex,
              chainName: chain.name,
              nativeCurrency: chain.nativeCurrency,
              rpcUrls: [chain.rpcUrl],
              blockExplorerUrls: chain.explorer ? [chain.explorer] : [],
            },
          ],
        })
        setChainId(chain.idHex)
        return true
      } catch (addError) {
        setError(describeProviderError(addError))
        return false
      }
    }
  }, [])

  const sendNative = useCallback(
    async (to: string, amount: string) => {
      const provider = getProvider()
      if (!provider || !account) throw new Error("Conecta tu wallet primero")
      const value = parseUnits(amount, 18)
      return (await provider.request({
        method: "eth_sendTransaction",
        params: [{ from: account, to, value: `0x${value.toString(16)}` }],
      })) as string
    },
    [account],
  )

  const sendToken = useCallback(
    async (token: string, to: string, amount: string, decimals: number) => {
      const provider = getProvider()
      if (!provider || !account) throw new Error("Conecta tu wallet primero")
      const data = encodeErc20Transfer(to, parseUnits(amount, decimals))
      return (await provider.request({
        method: "eth_sendTransaction",
        params: [{ from: account, to: token, data }],
      })) as string
    },
    [account],
  )

  const clearError = useCallback(() => setError(null), [])

  return {
    available,
    account,
    chainId,
    connecting,
    error,
    connect,
    disconnect,
    ensureNetwork,
    sendNative,
    sendToken,
    clearError,
  }
}
