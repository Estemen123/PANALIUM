import type { Product } from "./types"

export function productsByWholesaler(
  products: Product[],
  wholesalerId: string,
): Product[] {
  return products.filter((p) => p.wholesalerId === wholesalerId)
}

export function productCategories(products: Product[]): string[] {
  return Array.from(new Set(products.map((p) => p.category)))
}

export function matchesProductSearch(product: Product, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    product.name.toLowerCase().includes(q) ||
    product.wholesalerName.toLowerCase().includes(q)
  )
}
