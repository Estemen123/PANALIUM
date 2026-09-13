import type { Currency, ISODate } from "@/domain/common/types"

export interface Product {
  id: string

  wholesalerId: string

  wholesalerName: string

  name: string

  description: string

  unitPrice: number

  currency: Currency

  minUnits: number

  image: string

  category: string

  available: boolean

  createdAt: ISODate
}

export interface CreateProductInput {
  description: string

  link: string

  minQuantity: number

  unitPrice: number

  photo: File | null
}
