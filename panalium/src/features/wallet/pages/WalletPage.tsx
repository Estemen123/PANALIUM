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
  const usdtBalance =
    tokenBalance?.formatted ?? formatPrice(user.wallet.usdt, "USDT")

  return (
    <Page width="md">
      <PageHeader
        title="Reserva de USDT"
        description="Tu billetera Web3: USDT para comprar en Panales y tokens BS de recompensa."
      />
      <WalletAddressCard address={address} />

      <div className="grid grid-cols-2 gap-4 mb-6">
        <BalanceCard
          symbol="USDT"
          name="USDT"
          subtitle="Moneda de la colmena"
          color={COLORS.honey}
          value={usdtBalance}
        />
        <BalanceCard
          symbol="AVAX"
          name="AVAX"
          subtitle={chain?.name ?? "Avalanche Fuji"}
          color={COLORS.honeyLight}
          value={account?.balance.avax ?? "0"}
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
          <Icon.send /> Enviar USDT
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
