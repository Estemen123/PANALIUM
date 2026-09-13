import type { BuyingGroup, CreateGroupInput, GroupType } from "@/domain"
import { apiFetch, apiUrl, getCurrentIdToken } from "@/shared/lib/api"
import { PLACEHOLDER_IMAGES } from "@/shared/config/placeholders"

export interface BackendPanalMember {
  uid: string
  name: string
  wallet: string
  units: number
  advancePaid: number
  transactionHash: string
  explorerUrl: string
  joinedAt: string
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
  unitPrice: number
  deadline: string
  finReservas: number
  status: "open" | "funded"
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
}

interface BackendPanalesResponse {
  items: BackendPanalRecord[]
}

interface BackendPanalResponse {
  item?: BackendPanalRecord
  error?: string
  message?: string
}

function productLabelFromDescription(description: string): string {
  const trimmed = description.trim()
  if (!trimmed) return "Producto del Panal"
  return trimmed.length > 44 ? `${trimmed.slice(0, 41)}...` : trimmed
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
      paid: m.advancePaid,
      currency: "USDC",
      joinedAt: m.joinedAt || createdAt,
    })),
    status: record.status,
    category: "General",
    createdAt,
    deadline: record.deadline || undefined,
    txHash: record.transactionHash,
    explorerUrl: record.explorerUrl,
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
 * Funda el Panal: la wallet master llama crearPanal en EscrowPanales y la smart account
 * del fundador paga el adelanto de sus celdas con unirseAlPanal. Solo entonces se guarda.
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

  const response = await fetch(apiUrl("/panales"), {
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

/** Reserva celdas en un Panal existente pagando el adelanto desde la smart account. */
export async function joinPanalOnBackend(
  panalId: string,
  units: number,
): Promise<BuyingGroup> {
  const response = await fetch(apiUrl(`/panales/${panalId}/join`), {
    method: "POST",
    headers: {
      ...(await authHeaders()),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ units }),
  })
  const payload = (await response
    .json()
    .catch(() => null)) as BackendPanalResponse | null
  if (!response.ok || !payload?.item) {
    throw new Error(errorMessage(payload, "No se pudo pagar la reserva"))
  }
  return mapBackendPanal(payload.item)
}
