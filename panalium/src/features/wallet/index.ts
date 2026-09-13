export { default as WalletPage } from "./pages/WalletPage"

export { default as FundAccountModal } from "./components/FundAccountModal"

export {
  default as SmartAccountProvider,
  useSmartAccount,
} from "./SmartAccountProvider"

export type { SmartAccountState } from "./hooks/useSmartAccount"

export { useExternalWallet } from "./hooks/useExternalWallet"

export type { ExternalWalletState } from "./hooks/useExternalWallet"

export type { ChainConfig, ChainToken, SmartAccount, TokenBalance } from "./api"
