import { useState } from "react"
import { Button, Page, PageHeader } from "@/shared/ui"
import { Icon } from "@/shared/icons/Icon"
import { COLORS } from "@/shared/config/theme"
import { formatPrice } from "@/shared/lib/format"
import { MOCK_TRANSACTIONS } from "@/data/mocks"
import { useCurrentUser } from "@/features/auth"
import WalletAddressCard from "../components/WalletAddressCard"
import BalanceCard from "../components/BalanceCard"
import TransactionList from "../components/TransactionList"
import SendFundsModal from "../components/SendFundsModal"
import FundAccountModal from "../components/FundAccountModal"
import { useSmartAccount } from "../SmartAccountProvider"

export default function WalletPage() {
  const user = useCurrentUser()
  const { account, chain, tokenBalance, refresh } = useSmartAccount()
  const [sendOpen, setSendOpen] = useState(false)
  const [fundOpen, setFundOpen] = useState(false)

  // Mientras el backend responde, mostramos la dirección que ya trae la sesión.
  const address = account?.address || user.wallet.address
  const usdcBalance =
    tokenBalance?.formatted ?? formatPrice(user.wallet.usdc, "USDC")

  return (
    <Page width="md">
      <PageHeader
        title="Reserva de USDC"
        description="Tu billetera Web3: USDC para comprar en Panales y tokens BS de recompensa."
      />
      <WalletAddressCard address={address} />

      <div className="mb-6">
        <BalanceCard
          symbol="USDC"
          name="USDC"
          subtitle="Moneda de la colmena"
          color={COLORS.honey}
          value={usdcBalance}
        />
      </div>

      <div className="flex gap-3 mb-8">
        <Button onClick={() => setFundOpen(true)} disabled={!account || !chain}>
          <Icon.wallet /> Fondear con MetaMask
        </Button>
        <Button
          variant="secondary"
          className="text-foreground"
          onClick={() => setSendOpen(true)}
        >
          <Icon.send /> Enviar USDC
        </Button>
      </div>

      <h2 className="display text-xl font-bold mb-4">
        Movimientos de la colmena
      </h2>
      <TransactionList transactions={MOCK_TRANSACTIONS} />

      {sendOpen && <SendFundsModal onClose={() => setSendOpen(false)} />}
      {fundOpen && account && chain && (
        <FundAccountModal
          address={account.address}
          chain={chain}
          onClose={() => setFundOpen(false)}
          onFunded={() => void refresh()}
        />
      )}
    </Page>
  )
}
