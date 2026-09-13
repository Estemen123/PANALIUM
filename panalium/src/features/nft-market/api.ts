import type {
  MakeOfferInput,
  MarketOffer,
  MarketOfferStatus,
  MarketSale,
  NFTListing,
  NFTListingStatus,
} from "@/domain"
import { apiFetch, getCurrentIdToken } from "@/shared/lib/api"
import { PLACEHOLDER_IMAGES } from "@/shared/config/placeholders"

/** Publicación tal como la devuelve `GET /api/mercado` (Firestore `mercado`). */
export interface BackendMarketListing {
  id: string
  sellerUid: string
  sellerName: string
  tokenId: number
  panalId: string
  productName: string
  photoUrl: string
  unitPrice: number | null
  initialAmount: number
  amount: number
  askPrice: number
  currency: string
  status: string
  createdAt: string | null
  offersCount: number
  bestOffer: number | null
  offers: BackendMarketOffer[]
}

export interface BackendMarketOffer {
  id: string
  listingId: string
  buyerUid: string
  buyerName: string
  amount: number
  price: number
  status: string
  createdAt: string | null
}

export interface BackendMarketSale {
  id: string
  listingId: string
  tokenId: number
  productName: string
  sellerName: string
  buyerName: string
  units: number
  price: number
  total: number
  via: string
  createdAt: string | null
}

interface BackendMarketResponse {
  items: BackendMarketListing[]
  sales: BackendMarketSale[]
}

/** Estado del Mercado ya mapeado al dominio. */
export interface MarketSnapshot {
  listings: NFTListing[]
  sales: MarketSale[]
}

export interface PublishListingInput {
  tokenId: string
  amount: number
  askPrice: number
}

const LISTING_STATUS: Record<string, NFTListingStatus> = {
  activa: "active",
  vendida: "sold",
  cancelada: "cancelled",
}

const OFFER_STATUS: Record<string, MarketOfferStatus> = {
  pendiente: "pending",
  aceptada: "accepted",
  rechazada: "rejected",
  retirada: "withdrawn",
  cerrada: "closed",
}

function productLabel(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return "Producto del Panal"
  return trimmed.length > 44 ? `${trimmed.slice(0, 41)}...` : trimmed
}

const isoDate = (value: string | null) => value ?? new Date().toISOString()

function mapOffer(o: BackendMarketOffer): MarketOffer {
  return {
    id: o.id,
    listingId: o.listingId,
    buyerId: o.buyerUid,
    buyerName: o.buyerName || "Abeja",
    amount: o.amount,
    price: o.price,
    status: OFFER_STATUS[o.status] ?? "pending",
    createdAt: isoDate(o.createdAt),
  }
}

function mapListing(l: BackendMarketListing): NFTListing {
  return {
    id: l.id,
    tokenId: String(l.tokenId),
    groupId: l.panalId,
    groupName: productLabel(l.productName),
    productImage: l.photoUrl || PLACEHOLDER_IMAGES.group,
    sellerId: l.sellerUid,
    sellerName: l.sellerName || "Abeja",
    amount: l.amount,
    askPrice: l.askPrice,
    askCurrency: "USDC",
    listingStatus: LISTING_STATUS[l.status] ?? "active",
    createdAt: isoDate(l.createdAt),
    supplierETA: "",
    initialAmount: l.initialAmount,
    originalUnitPrice: l.unitPrice,
    offers: l.offers.map(mapOffer),
    offersCount: l.offersCount,
    bestOfferPrice: l.bestOffer,
  }
}

function mapSale(s: BackendMarketSale): MarketSale {
  return {
    id: s.id,
    listingId: s.listingId,
    groupName: productLabel(s.productName),
    tokenId: String(s.tokenId),
    sellerName: s.sellerName || "Abeja",
    buyerName: s.buyerName || "Abeja",
    units: s.units,
    price: s.price,
    total: s.total,
    via: s.via === "oferta" ? "oferta" : "compra",
    createdAt: isoDate(s.createdAt),
  }
}

const toSnapshot = (r: BackendMarketResponse): MarketSnapshot => ({
  listings: r.items.map(mapListing),
  sales: r.sales.map(mapSale),
})

async function headers(token?: string): Promise<Record<string, string>> {
  return {
    Authorization: `Bearer ${token || (await getCurrentIdToken())}`,
    "Content-Type": "application/json",
  }
}

async function post(path: string, body: unknown = {}): Promise<MarketSnapshot> {
  const response = await apiFetch<BackendMarketResponse>(path, {
    method: "POST",
    headers: await headers(),
    body: JSON.stringify(body),
  })
  return toSnapshot(response)
}

export async function loadMarketFromBackend(token?: string): Promise<MarketSnapshot> {
  const response = await apiFetch<BackendMarketResponse>("/mercado", {
    headers: await headers(token),
  })
  return toSnapshot(response)
}

export const publishListingOnBackend = (input: PublishListingInput) =>
  post("/mercado", {
    tokenId: Number(input.tokenId),
    amount: input.amount,
    askPrice: input.askPrice,
  })

export const cancelListingOnBackend = (listingId: string) =>
  post(`/mercado/${listingId}/retirar`)

export const buyListingOnBackend = (listingId: string, amount: number) =>
  post(`/mercado/${listingId}/comprar`, { amount })

export const makeOfferOnBackend = (listingId: string, input: MakeOfferInput) =>
  post(`/mercado/${listingId}/ofertas`, input)

export const acceptOfferOnBackend = (listingId: string, offerId: string) =>
  post(`/mercado/${listingId}/ofertas/${offerId}/aceptar`)

export const rejectOfferOnBackend = (listingId: string, offerId: string) =>
  post(`/mercado/${listingId}/ofertas/${offerId}/rechazar`)

export const withdrawOfferOnBackend = (listingId: string, offerId: string) =>
  post(`/mercado/${listingId}/ofertas/${offerId}/retirar`)
