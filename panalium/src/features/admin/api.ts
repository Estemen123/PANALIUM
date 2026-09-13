import { apiFetch, getCurrentIdToken } from "@/shared/lib/api"

/** Estado global de EscrowPanales leído por el backend. Cada campo es null si su lectura falló. */
export interface EscrowContractInfo {
  address: string
  chainId: number
  owner: string | null
  tesoreria: string | null
  usdc: string | null
  masterAddress: string | null
  masterEsOwner: boolean
  advancePercent: number | null
  saldoEscrowUsdc: number | null
  saldoTesoreriaUsdc: number | null
  avaxMaster: number | null
  blockTimestamp: number | null
}

/** Struct `panales(panalId)` del contrato. Los montos llegan en unidades mínimas de USDC (string). */
export interface EscrowPanalOnchain {
  precioEstimadoUnidad: string
  precioFinalUnidad: string
  minimoUnidades: string
  objetivoUnidades: string
  unidadesReservadas: string
  unidadesPagadasCompletas: string
  fondosPagadosCompletos: string
  finReservas: number
  finRecoleccion: number
  estado: number
  etapa: string
}

export interface EscrowPanalRow {
  id: string
  description: string
  createdByName: string
  members: number
  tokenId: number | null
  exakeysEmitidas: boolean
  onchain: EscrowPanalOnchain | null
}

export interface EscrowTx {
  transactionHash: string
  blockNumber: string
  explorerUrl: string
}

/** Funciones onlyOwner que actúan sobre un Panal. */
export type EscrowPanalFunction =
  | "iniciarCotizacion"
  | "abrirRecoleccion"
  | "extenderPlazo"
  | "liberarFondos"
  | "sellarPanal"
  | "cancelarPanal"

export interface EscrowActionBody {
  precioFinalUnidad?: number
  horas?: number
}

interface ContractResponse {
  contract: EscrowContractInfo
  explorerUrl: string
}

interface PanalesResponse {
  items: EscrowPanalRow[]
}

interface ActionResponse {
  tx: EscrowTx
}

async function authed(init?: RequestInit): Promise<RequestInit> {
  return {
    ...init,
    headers: {
      Authorization: `Bearer ${await getCurrentIdToken()}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  }
}

export async function loadEscrowContract(): Promise<ContractResponse> {
  return apiFetch<ContractResponse>("/admin/escrow", await authed())
}

export async function loadEscrowPanales(): Promise<EscrowPanalRow[]> {
  const { items } = await apiFetch<PanalesResponse>(
    "/admin/escrow/panales",
    await authed(),
  )
  return items
}

/** Firma con la wallet master y espera la confirmación (10-40 s en Fuji). */
export async function callEscrowPanalFunction(
  panalId: string,
  fn: EscrowPanalFunction,
  body: EscrowActionBody = {},
): Promise<EscrowTx> {
  const { tx } = await apiFetch<ActionResponse>(
    `/admin/escrow/panales/${encodeURIComponent(panalId)}/${fn}`,
    await authed({ method: "POST", body: JSON.stringify(body) }),
  )
  return tx
}

export async function transferEscrowOwnership(
  newOwner: string,
  confirm: string,
): Promise<EscrowTx> {
  const { tx } = await apiFetch<ActionResponse>(
    "/admin/escrow/transferOwnership",
    await authed({
      method: "POST",
      body: JSON.stringify({ newOwner, confirm }),
    }),
  )
  return tx
}
