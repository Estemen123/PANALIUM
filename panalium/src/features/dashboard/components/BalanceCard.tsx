import { useState } from "react"

import { Button, Card, Hex } from "@/shared/ui"

import { Icon } from "@/shared/icons/Icon"

import { COLORS } from "@/shared/config/theme"

import { useClipboard } from "@/shared/hooks"

import { useNavigation } from "@/app/navigation"

import { FundAccountModal, useSmartAccount } from "@/features/wallet"

/**
 * Tarjeta principal de Mi Colmena: saldo, dirección de la cuenta y fondeo desde MetaMask.
 *
 * La dirección y los saldos vienen del backend, no del estado local: es la smart account real
 * del usuario en Avalanche Fuji.
 */

export default function BalanceCard() {
  const { navigate } = useNavigation()

  const { account, chain, tokenBalance, loading, error, refresh } =
    useSmartAccount()

  const { copied, copy } = useClipboard()

  const [fundOpen, setFundOpen] = useState(false)

  // Sin ERC-20 configurado en el backend, la reserva se lleva en el token nativo de la red.

  const symbol = chain?.token?.symbol ?? chain?.nativeCurrency.symbol ?? "USDC"

  const balance =
    tokenBalance?.formatted ?? (chain?.token ? "0" : account?.balance.avax)

  return (
    <Card className="p-6 flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <span className="label">Reserva de {symbol}</span>
        <Hex size={28} color={COLORS.honey} />
      </div>

      <p className="mono text-[38px] font-semibold leading-none">
        {loading ? "…" : (balance ?? "0")}{" "}
        <span className="text-base text-muted-foreground">{symbol}</span>
      </p>

      {account ? (
        <div className="flex items-center gap-2">
          <span className="label shrink-0">ID de wallet</span>
          <code className="mono text-xs truncate text-muted-foreground flex-1">
            {account.address}
          </code>
          <button
            type="button"
            onClick={() => copy(account.address)}
            className="shrink-0 text-muted-foreground hover:text-brown transition-colors p-1"
            aria-label="Copiar el ID de tu wallet"
          >
            {copied ? <Icon.check /> : <Icon.copy />}
          </button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {error ? "No pudimos cargar tu wallet." : "Preparando tu wallet..."}
        </p>
      )}

      {account && !account.deployed && (
        <p className="text-xs text-muted-foreground">
          Tu cuenta se activa en la red con tu primer movimiento. Ya puedes
          recibir fondos en ella.
        </p>
      )}

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => setFundOpen(true)}
          disabled={!account || !chain}
        >
          <Icon.wallet /> Fondear con MetaMask
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate("wallet")}
        >
          Ver movimientos
        </Button>
      </div>

      {fundOpen && account && chain && (
        <FundAccountModal
          address={account.address}
          chain={chain}
          onClose={() => setFundOpen(false)}
          onFunded={() => void refresh()}
        />
      )}
    </Card>
  )
}
