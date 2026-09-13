import type {
  BuyingGroup,
  CreateGroupInput,
  GroupStatus,
  GroupType,
  PanalQuote,
  PanalStage,
} from "@/domain"
import { apiFetch, apiUrl, getCurrentIdToken } from "@/shared/lib/api"
import { PLACEHOLDER_IMAGES } from "@/shared/config/placeholders"

export interface BackendPanalMember {
  uid: string
  name: string
  wallet: string
  units: number
  paidTotal: number
  paidComplete: boolean
  transactionHash: string
  explorerUrl: string
  joinedAt: string
}

export interface BackendExaKeysInfo {
  tokenId: number
  units: number
  contractAddress: string
  chainId: number
  transactionHash: string | null
  explorerUrl: string | null
}

export interface BackendPanalRecord {
  id: string
  type: string
  photoUrl: string
  description: string
  link: string
  minQuantity: number
  targetUnits: number
  currentUnits: number
  paidUnits: number
  unitPrice: number
  finalUnitPrice: number | null
  deadline: string
  finReservas: number
  stage: PanalStage
  collectionEndsAt: string | null
  collectionExpired: boolean
  quote: PanalQuote | null
  tokenId: number | null
  exakeys: BackendExaKeysInfo | null
  members: BackendPanalMember[]
  contractAddress: string
  transactionHash: string
  explorerUrl: string
  createdBy: string
  createdByName: string
  createdAt: string | null
}

export interface PanalConfig {
  /** Porcentaje del total que se paga al reservar (PORCENTAJE_ADELANTO del contrato). */
  advancePercent: number
  contractAddress: string
  /** Horas que tienen las Abejas para pagar el restante. */
  collectionHours: number
  defaultProfitPercent: number
}

/** Datos que el admin trae de la negociación con el proveedor. */
export interface QuoteInput {
  precioProveedorUnidad: number
  envioTotal: number
  otrosCostos: number
  gananciaPorcentaje: number
}

interface BackendPanalesResponse {
  items: BackendPanalRecord[]
}

interface BackendPanalResponse {
  item?: BackendPanalRecord
  quote?: PanalQuote
  error?: string
  message?: string
}

function productLabelFromDescription(description: string): string {
  const trimmed = description.trim()
  if (!trimmed) return "Producto del Panal"
  return trimmed.length > 44 ? `${trimmed.slice(0, 41)}...` : trimmed
}

function statusFromStage(record: BackendPanalRecord): GroupStatus {
  switch (record.stage) {
    case "negociando":
      return "negotiating"
    case "cobrando":
      return "collecting"
    case "liberado":
      return "paid_to_supplier"
    case "sellado":
      return "closed"
    case "cancelado":
      return "cancelled"
    default:
      return record.targetUnits > 0 && record.currentUnits >= record.targetUnits
        ? "funded"
        : "open"
  }
}

/** Cada Panal del backend tiene un único Enjambre con toda la capacidad. */
export function mapBackendPanal(record: BackendPanalRecord): BuyingGroup {
  const type: GroupType =
    record.type === "international" ? "international" : "local"
  const swarmId = `${record.id}-e1`
  const createdAt = record.createdAt ?? new Date().toISOString()
  return {
    id: record.id,
    type,
    creatorId: record.createdBy,
    creatorName: record.createdByName || "Abeja fundadora",
    productName: productLabelFromDescription(record.description),
    description: record.description,
    productLink: record.link,
    imageUrl:
      record.photoUrl ||
      (type === "international"
        ? PLACEHOLDER_IMAGES.internationalGroup
        : PLACEHOLDER_IMAGES.group),
    targetUnits: record.targetUnits,
    currentUnits: record.currentUnits,
    unitPrice: record.unitPrice,
    currency: "USDC",
    entryDeposit: 0,
    minUnits: record.minQuantity,
    swarms: [
      {
        id: swarmId,
        name: "Enjambre 1",
        pickupPoint: "Por definir",
        capacity: record.targetUnits,
      },
    ],
    members: record.members.map((m) => ({
      userId: m.uid,
      userName: m.name || "Abeja",
      swarmId,
      units: m.units,
      paid: m.paidTotal,
      paidComplete: m.paidComplete,
      currency: "USDC",
      joinedAt: m.joinedAt || createdAt,
    })),
    status: statusFromStage(record),
    stage: record.stage,
    paidUnits: record.paidUnits,
    finalUnitPrice: record.finalUnitPrice ?? undefined,
    quote: record.quote ?? undefined,
    collectionEndsAt: record.collectionEndsAt ?? undefined,
    collectionExpired: record.collectionExpired,
    tokenId: record.tokenId ?? undefined,
    exakeysExplorerUrl: record.exakeys?.explorerUrl ?? undefined,
    category: "General",
    createdAt,
    deadline: record.deadline || undefined,
    txHash: record.transactionHash,
    explorerUrl: record.explorerUrl,
  }
}

/**
 * Una operación on-chain (UserOp + confirmación) tarda normalmente 10-40 s. Pasado este límite
 * cortamos la espera para no dejar la pantalla colgada, sin sugerir reintentar: el pago pudo
 * haber salido igual.
 */
const ONCHAIN_TIMEOUT_MS = 150_000

async function fetchOnchain(path: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ONCHAIN_TIMEOUT_MS)
  try {
    return await fetch(apiUrl(path), { ...init, signal: controller.signal })
  } catch (err) {
    if (controller.signal.aborted) {
      throw new Error(
        "La operación en Avalanche está tardando más de lo normal. No la repitas todavía: en unos minutos revisa Mis Panales y tu reserva de USDC.",
      )
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

async function authHeaders(token?: string): Promise<Record<string, string>> {
  return { Authorization: `Bearer ${token || (await getCurrentIdToken())}` }
}

function errorMessage(
  payload: BackendPanalResponse | null,
  fallback: string,
): string {
  if (payload?.error && payload.error !== "onchain_error") return payload.error
  return payload?.message || fallback
}

async function postJson(
  path: string,
  body: unknown,
  fallback: string,
): Promise<BackendPanalResponse> {
  const response = await fetchOnchain(path, {
    method: "POST",
    headers: {
      ...(await authHeaders()),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body ?? {}),
  })
  const payload = (await response
    .json()
    .catch(() => null)) as BackendPanalResponse | null
  if (!response.ok || !payload) throw new Error(errorMessage(payload, fallback))
  return payload
}

async function panalAction(
  panalId: string,
  action: string,
  body: unknown,
  fallback: string,
): Promise<BuyingGroup> {
  const payload = await postJson(`/panales/${panalId}/${action}`, body, fallback)
  if (!payload.item) throw new Error(fallback)
  return mapBackendPanal(payload.item)
}

export async function loadPanalesFromBackend(
  token?: string,
): Promise<BuyingGroup[]> {
  const response = await apiFetch<BackendPanalesResponse>("/panales", {
    headers: await authHeaders(token),
  })
  return response.items.map(mapBackendPanal)
}

export async function loadPanalConfig(): Promise<PanalConfig> {
  return apiFetch<PanalConfig>("/panales/config", {
    headers: await authHeaders(),
  })
}

/**
 * Funda el Panal: la smart account del fundador manda una UserOp (paymaster de ZeroDev)
 * con approve del adelanto + crearPanal. Solo si se confirma se guarda.
 */
export async function createPanalOnBackend(
  input: CreateGroupInput,
): Promise<BuyingGroup> {
  const formData = new FormData()
  if (input.photo) {
    formData.append("photo", input.photo, input.photo.name || "panal.png")
  }
  formData.append("type", input.type)
  formData.append("description", input.description)
  formData.append("link", input.productLink ?? "")
  formData.append("minQuantity", String(input.targetUnits))
  formData.append("unitPrice", String(input.unitPrice))
  formData.append("deadline", input.deadline ?? "")
  formData.append("units", String(input.reserveUnits))

  const response = await fetchOnchain("/panales", {
    method: "POST",
    headers: await authHeaders(),
    body: formData,
  })
  const payload = (await response
    .json()
    .catch(() => null)) as BackendPanalResponse | null
  if (!response.ok || !payload?.item) {
    throw new Error(
      errorMessage(payload, "No se pudo crear el Panal en el contrato"),
    )
  }
  return mapBackendPanal(payload.item)
}

/* ── Acciones de la Abeja ─────────────────────────────────────────────── */

/** Reservando: paga el adelanto. Cobrando: entra pagando el total al precio final. */
export const joinPanalOnBackend = (panalId: string, units: number) =>
  panalAction(panalId, "join", { units }, "No se pudo pagar la reserva")

/** Suma celdas a una participación existente. */
export const increasePanalOnBackend = (panalId: string, units: number) =>
  panalAction(panalId, "aumentar", { units }, "No se pudo aumentar tu participación")

/** Paga el restante y las comisiones al precio final. */
export const payRemainingOnBackend = (panalId: string) =>
  panalAction(panalId, "pagar-saldo", {}, "No se pudo pagar el restante")

export const refundPanalOnBackend = (panalId: string) =>
  panalAction(panalId, "reembolsar", {}, "No se pudo reembolsar")

/* ── Acciones de admin ────────────────────────────────────────────────── */

export const startNegotiationOnBackend = (panalId: string) =>
  panalAction(panalId, "negociacion", {}, "No se pudo iniciar la negociación")

export async function estimateQuoteOnBackend(
  panalId: string,
  input: QuoteInput,
): Promise<PanalQuote> {
  const payload = await postJson(
    `/panales/${panalId}/cotizacion/estimar`,
    input,
    "No se pudo calcular la cotización",
  )
  if (!payload.quote) throw new Error("No se pudo calcular la cotización")
  return payload.quote
}

/** Abre el cobro del restante con el precio final calculado. */
export const openCollectionOnBackend = (panalId: string, input: QuoteInput) =>
  panalAction(panalId, "cotizacion", input, "No se pudo abrir el cobro")

export const extendCollectionOnBackend = (panalId: string, hours: number) =>
  panalAction(panalId, "extender", { hours }, "No se pudo extender el plazo")

/** liberarFondos + sellarPanal + ExaKeys en HashKey. */
export const sealPanalOnBackend = (panalId: string) =>
  panalAction(panalId, "sellar", {}, "No se pudo sellar el Panal")

export const cancelPanalOnBackend = (panalId: string) =>
  panalAction(panalId, "cancelar", {}, "No se pudo cancelar el Panal")
