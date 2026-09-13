import { useState } from "react"
import { Button, Card } from "@/shared/ui"
import { Icon } from "@/shared/icons/Icon"
import { formatPrice } from "@/shared/lib/format"
import type { NFTListing, Wallet } from "@/domain"

/** Comisión de la colmena sobre cada compra en el Mercado de Abejas. */
export const MARKET_FEE_RATE = 0.02

export interface BuyPanelProps {
  listing: NFTListing
  wallet: Wallet
  onConfirm: (units: number) => void
}

/** Panel lateral de compra de una Hexakey: celdas, desglose y confirmación. */
export default function BuyPanel({
  listing,
  wallet,
  onConfirm,
}: BuyPanelProps) {
  const [units, setUnits] = useState(Math.min(5, listing.amount))
  const clamp = (n: number) => Math.min(listing.amount, Math.max(1, n))
  const subtotal = units * listing.askPrice
  const fee = subtotal * MARKET_FEE_RATE
  const total = subtotal + fee
  const cur = listing.askCurrency
  const balance = cur === "USDT" ? wallet.usdt : wallet.bs
  const remaining = balance - total

  return (
    <Card tone="dark" className="p-[22px] flex flex-col gap-4">
      <div>
        <p className="label text-honey-light">Comprar Hexakey</p>
        <h2 className="display text-xl font-bold mt-1 leading-tight">
          {listing.groupName}
        </h2>
        <p className="mono text-[11px] text-secondary-foreground mt-1">
          HEXAKEY #{listing.tokenId.toUpperCase()} · vende {listing.sellerName}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="label text-secondary-foreground">
          Celdas a comprar (máx. {listing.amount})
        </span>
        <div className="h-11 border-[1.5px] border-olive rounded-xl flex items-center justify-between px-3">
          <button
            type="button"
            onClick={() => setUnits((u) => clamp(u - 1))}
            className="text-secondary-foreground hover:text-foreground p-1"
            aria-label="Menos celdas"
          >
            <Icon.minus />
          </button>
          <input
            type="number"
            min={1}
            max={listing.amount}
            value={units}
            onChange={(e) => setUnits(clamp(parseInt(e.target.value, 10) || 1))}
            className="mono w-16 bg-transparent text-center text-base font-semibold text-foreground border-0 focus:shadow-none"
            aria-label="Celdas"
          />
          <button
            type="button"
            onClick={() => setUnits((u) => clamp(u + 1))}
            className="text-honey-light hover:text-foreground p-1"
            aria-label="Más celdas"
          >
            <Icon.plus />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 p-3.5 bg-carbon rounded-xl text-[13px]">
        <div className="flex justify-between text-secondary-foreground">
          <span>
            {units} celdas × {formatPrice(listing.askPrice, cur)} {cur}
          </span>
          <span className="mono">{formatPrice(subtotal, cur)}</span>
        </div>
        <div className="flex justify-between text-secondary-foreground">
          <span>
            Comisión de la colmena {Math.round(MARKET_FEE_RATE * 100)}%
          </span>
          <span className="mono">{formatPrice(fee, cur)}</span>
        </div>
        <div className="h-px bg-border-dark" />
        <div className="flex justify-between font-bold">
          <span>Total</span>
          <span className="mono text-honey-light">
            {formatPrice(total, cur)} {cur}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {remaining >= 0
            ? `Te quedan ${formatPrice(remaining, cur)} ${cur} después de la compra`
            : `Te faltan ${formatPrice(-remaining, cur)} ${cur} en tu reserva`}
        </p>
      </div>

      <p className="text-xs text-secondary-foreground leading-relaxed">
        La Hexakey vuela a tu billetera al confirmar. Podrás reclamar el
        producto cuando el Panal llegue o volver a venderla aquí.
      </p>
      <Button
        size="lg"
        block
        className="mt-auto"
        disabled={remaining < 0}
        onClick={() => onConfirm(units)}
      >
        Confirmar compra · {formatPrice(total, cur)} {cur}
      </Button>
    </Card>
  )
}
