import { useCallback, useMemo } from "react"

import {
  productCategories,
  productsByWholesaler,
  type CreateProductInput,
  type Product,
} from "@/domain"

import { productsActions, useAppDispatch, useAppState } from "@/store"

import { getCurrentIdToken } from "@/shared/lib/api"

import { useCurrentUser } from "@/features/auth/AuthProvider"

import { createProductOnBackend } from "../api"

export function useProducts() {
  const { products } = useAppState()

  const categories = useMemo(() => productCategories(products), [products])

  return { products, categories }
}

/** Products published by the signed-in wholesaler. */

export function useMyProducts(): Product[] {
  const user = useCurrentUser()

  const { products } = useAppState()

  return useMemo(
    () => productsByWholesaler(products, user.id),

    [products, user.id],
  )
}

export function useProductActions() {
  const dispatch = useAppDispatch()

  const addProduct = useCallback(
    async (input: CreateProductInput) => {
      const token = await getCurrentIdToken()

      const product = await createProductOnBackend(input, token)

      dispatch(productsActions.add(product))

      return product
    },

    [dispatch],
  )

  return { addProduct }
}
