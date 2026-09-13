import type { Product } from "@/domain"

import type { AppAction } from "../types"

export interface AddProductAction {
  type: "products/add"

  product: Product
}

export interface SetProductsAction {
  type: "products/setAll"

  products: Product[]
}

export type ProductsAction = AddProductAction | SetProductsAction

export const productsActions = {
  add: (product: Product): ProductsAction => ({
    type: "products/add",

    product,
  }),

  setAll: (products: Product[]): ProductsAction => ({
    type: "products/setAll",

    products,
  }),
}

export function productsReducer(
  state: Product[],

  action: AppAction,
): Product[] {
  switch (action.type) {
    case "products/add":
      return [...state, action.product]

    case "products/setAll":
      return action.products

    default:
      return state
  }
}
