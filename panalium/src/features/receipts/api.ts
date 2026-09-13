import type { ERC1155Token } from "@/domain"
import { apiFetch, getCurrentIdToken } from "@/shared/lib/api"
import { PLACEHOLDER_IMAGES } from "@/shared/config/placeholders"

/** Un documento de `exakeys`: una unidad de producto de un Panal sellado. */
export interface BackendExaKey {
  id: string
  tokenId: number
  serial: number
  panalId: string
  productName: string
  photoUrl: string
  unitPrice: number | null
  ownerUid: string
  ownerName: string
  ownerWallet: string
  custodian: string
  contractAddress: string
  chainId: number
  mintTransactionHash: string | null
  explorerUrl: string | null
  status: string
  listingId: string | null
  createdAt: string | null
}

interface BackendExaKeysResponse {
  items: BackendExaKey[]
}

function productLabel(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return "Producto del Panal"
  return trimmed.length > 44 ? `${trimmed.slice(0, 41)}...` : trimmed
}

/**
 * Agrupa las ExaKeys por (token, dueño, publicación): la galería muestra una Hexakey por Panal con
 * `amount` = cantidad de unidades, y aparte las que están en venta en el Mercado de Abejas.
 * On-chain todas siguen en custodia de la wallet master.
 */
export function groupExaKeys(items: BackendExaKey[]): ERC1155Token[] {
  const byKey = new Map<string, ERC1155Token>()
  for (const k of items) {
    const key = `${k.tokenId}-${k.ownerUid}-${k.listingId ?? "libre"}`
    const current = byKey.get(key)
    if (current) {
      current.amount += 1
      continue
    }
    byKey.set(key, {
      id: key,
      tokenId: String(k.tokenId),
      groupId: k.panalId,
      groupName: productLabel(k.productName),
      productImage: k.photoUrl || PLACEHOLDER_IMAGES.group,
      ownerId: k.ownerUid,
      amount: 1,
      mintedAt: k.createdAt ?? new Date().toISOString(),
      status: k.listingId ? "listed" : "held",
      supplierETA: "",
      listingId: k.listingId ?? undefined,
      unitPrice: k.unitPrice ?? undefined,
    })
  }
  return [...byKey.values()]
}

export async function loadExaKeysFromBackend(
  token?: string,
): Promise<ERC1155Token[]> {
  const authToken = token || (await getCurrentIdToken())
  const response = await apiFetch<BackendExaKeysResponse>("/exakeys", {
    headers: { Authorization: `Bearer ${authToken}` },
  })
  return groupExaKeys(response.items)
}
