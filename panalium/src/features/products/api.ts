import type { CreateProductInput, Product } from "@/domain"
import { apiFetch, apiUrl, getCurrentIdToken } from "@/shared/lib/api"

export interface BackendProductRecord {
  id: string
  photoUrl: string
  description: string
  link: string
  minQuantity: number
  unitPrice: number
  createdBy: string
  createdAt: string | null
  updatedAt: string | null
}

interface BackendProductsResponse {
  items: BackendProductRecord[]
}

interface BackendProductResponse {
  item: BackendProductRecord
}

function productLabelFromDescription(description: string): string {
  const trimmed = description.trim()
  if (!trimmed) return "Producto"
  return trimmed.length > 44 ? `${trimmed.slice(0, 41)}...` : trimmed
}

export function mapBackendProduct(record: BackendProductRecord): Product {
  return {
    id: record.id,
    wholesalerId: record.createdBy,
    wholesalerName: "Proveedor",
    name: productLabelFromDescription(record.description),
    description: record.description,
    unitPrice: record.unitPrice,
    currency: "USDC",
    minUnits: record.minQuantity,
    image: record.photoUrl,
    category: "Productos",
    available: true,
    createdAt: record.createdAt ?? new Date().toISOString(),
  }
}

export async function loadProductsFromBackend(
  token?: string,
): Promise<Product[]> {
  const authToken = token || (await getCurrentIdToken())
  const response = await apiFetch<BackendProductsResponse>("/products", {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  })
  return response.items.map(mapBackendProduct)
}

export async function createProductOnBackend(
  input: CreateProductInput,
  token?: string,
): Promise<Product> {
  if (!input.photo) {
    throw new Error("photo is required")
  }

  const authToken = token || (await getCurrentIdToken())
  const formData = new FormData()
  formData.append("photo", input.photo, input.photo.name || "product.png")
  formData.append("description", input.description)
  formData.append("link", input.link)
  formData.append("minQuantity", String(input.minQuantity))
  formData.append("unitPrice", String(input.unitPrice))

  const response = await fetch(apiUrl("/products"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    body: formData,
  })

  const payload = (await response
    .json()
    .catch(() => null)) as BackendProductResponse | null
  if (!response.ok || !payload?.item) {
    throw new Error("Failed to create product")
  }

  return mapBackendProduct(payload.item)
}
