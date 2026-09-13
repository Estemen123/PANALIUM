import type { UserRole } from "@/domain"
import type { View } from "./types"

export interface NavItem {
  id: View
  label: string
  /** Elemento secundario, se muestra indentado bajo su sección. */
  nested?: boolean
}

const BUYER_NAV: NavItem[] = [
  { id: "dashboard", label: "Mi Colmena" },
  { id: "wallet", label: "Reserva de USDC" },
  { id: "marketplace-groups", label: "Panales" },
  { id: "my-groups", label: "Mis Panales", nested: true },
  { id: "create-group", label: "Fundar un Panal", nested: true },
  { id: "create-intl-group", label: "Panal de importación", nested: true },
  { id: "marketplace-products", label: "Catálogo de proveedores" },
  { id: "my-receipts", label: "Mis Recibos NFT" },
  { id: "nft-marketplace", label: "Mercado de Abejas" },
]

const WHOLESALER_NAV: NavItem[] = [
  { id: "dashboard", label: "Mi Colmena" },
  { id: "wallet", label: "Reserva de USDC" },
  { id: "wholesaler-products", label: "Mis productos" },
  { id: "wholesaler-add-product", label: "Publicar producto", nested: true },
  { id: "marketplace-groups", label: "Panales de Abejas" },
]

const ADMIN_NAV: NavItem[] = [
  { id: "admin-overview", label: "Resumen de la colmena" },
  { id: "admin-escrow", label: "Contrato Escrow" },
  { id: "admin-users", label: "Abejas" },
  { id: "marketplace-products", label: "Catálogo" },
  { id: "marketplace-groups", label: "Panales" },
]

export const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  buyer: BUYER_NAV,
  wholesaler: WHOLESALER_NAV,
  admin: ADMIN_NAV,
}

/** Primera pantalla tras entrar a la colmena, según el rol. */
export function homeViewForRole(role: UserRole): View {
  return role === "admin" ? "admin-overview" : "dashboard"
}
