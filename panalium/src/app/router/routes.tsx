import type { ComponentType } from "react"
import type { View } from "@/app/navigation"
import { DashboardPage } from "@/features/dashboard"
import { WalletPage } from "@/features/wallet"
import {
  AddProductPage,
  MarketplaceProductsPage,
  WholesalerProductsPage,
} from "@/features/products"
import {
  CreateIntlGroupPage,
  CreateLocalGroupPage,
  MarketplaceGroupsPage,
  MyGroupsPage,
} from "@/features/groups"
import { MyReceiptsPage } from "@/features/receipts"
import { NFTMarketplacePage } from "@/features/nft-market"
import { AdminEscrowPage, AdminOverviewPage, AdminUsersPage } from "@/features/admin"

/**
 * View to page registry. Adding a screen = add a `View` in `app/navigation/types.ts`,
 * build the page inside its feature, and map it here.
 */
export const ROUTES: Record<View, ComponentType> = {
  dashboard: DashboardPage,
  wallet: WalletPage,
  "marketplace-products": MarketplaceProductsPage,
  "marketplace-groups": MarketplaceGroupsPage,
  "my-groups": MyGroupsPage,
  "create-group": CreateLocalGroupPage,
  "create-intl-group": CreateIntlGroupPage,
  "wholesaler-products": WholesalerProductsPage,
  "wholesaler-add-product": AddProductPage,
  "admin-overview": AdminOverviewPage,
  "admin-users": AdminUsersPage,
  "admin-escrow": AdminEscrowPage,
  "my-receipts": MyReceiptsPage,
  "nft-marketplace": NFTMarketplacePage,
}
