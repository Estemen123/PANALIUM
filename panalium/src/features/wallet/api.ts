import { apiFetch, getCurrentIdToken } from "@/shared/lib/api"

/** Token ERC-20 que la app usa como moneda. `null` si el backend no tiene ninguno configurado. */
export interface ChainToken {
  symbol: string
  address: string
  decimals: number
}

export interface ChainConfig {
  id: number
  /** chainId en hexadecimal, que es lo que espera MetaMask. */
  idHex: string
  name: string
  nativeCurrency: NativeCurrency
  rpcUrl: string
  explorer: string | null
  token: ChainToken | null
}

export interface NativeCurrency {
  name: string
  symbol: string
  decimals: number
}

export interface AccountBalance {
  wei: string
  avax: string
}

/** Smart account del usuario, tal como la devuelve `GET /api/account/me`. */
export interface SmartAccount {
  uid: string
  /** `master`: el admin opera con la wallet master (EOA) en vez de una smart account. */
  kind?: "smart" | "master"
  address: string
  deployed: boolean
  balance: AccountBalance
  walletDocId: string | null
  explorerUrl: string
}

export interface TokenBalance {
  token: string
  symbol: string
  decimals: number
  raw: string
  formatted: string
}

export function loadChainConfig(): Promise<ChainConfig> {
  return apiFetch<ChainConfig>("/config/chain")
}

export async function loadSmartAccount(token?: string): Promise<SmartAccount> {
  const authToken = token || (await getCurrentIdToken())
  return apiFetch<SmartAccount>("/account/me", {
    headers: { Authorization: `Bearer ${authToken}` },
  })
}

export async function loadTokenBalance(
  tokenAddress: string,
  token?: string,
): Promise<TokenBalance> {
  const authToken = token || (await getCurrentIdToken())
  return apiFetch<TokenBalance>(`/account/token/${tokenAddress}`, {
    headers: { Authorization: `Bearer ${authToken}` },
  })
}
