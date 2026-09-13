export const PRODUCT_CATEGORIES = [
  "Alimentos",
  "Higiene",
  "Limpieza",
  "Electrónicos",
  "Ropa",
  "Otro",
] as const

export type ProductCategory = typeof PRODUCT_CATEGORIES[number]

export const IMPORT_CATEGORY = "Importación"
