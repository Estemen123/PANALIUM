/** Every screen the app can show. Add a new view here, then register it in `app/router/routes.tsx`. */
export type View = "dashboard" | "wallet" | "marketplace-products" | "marketplace-groups" | "my-groups" | "create-group" | "create-intl-group" | "wholesaler-products" | "wholesaler-add-product" | "admin-users" | "admin-overview" | "my-receipts" | "nft-marketplace"

export const DEFAULT_VIEW: View = "dashboard"
