import { useState } from "react"
import { Button, Card } from "@/shared/ui"
import { Icon } from "@/shared/icons/Icon"
import { formatPrice } from "@/shared/lib/format"
import { toFloat } from "@/shared/lib/number"
import type { MakeOfferInput, MarketOffer, NFTListing } from "@/domain"

export interface BuyPanelProps {
  listing: NFTListing
  /** Oferta pendiente del usuario en esta publicación, si la tiene. */
  myOffer?: MarketOffer
  busy: string | null
  onBuy: (units: number) => void
  onOffer: (input: MakeOfferInput) => void
  onWithdrawOffer: (offer: MarketOffer) => void
}

interface UnitsStepperProps {
  value: number
  max: number
  label: string
  onChange: (n: number) => void
}

function UnitsStepper({ value, max, label, onChange }: UnitsStepperProps) {
  const clamp = (n: number) => Math.min(max, Math.max(1, n))
  return (
    <div className="flex flex-col gap-1.5">
      <span className="label text-secondary-foreground">{label}</span>
      <div className="h-11 border-[1.5px] border-olive rounded-xl flex items-center justify-between px-3">
        <button
          type="button"
          onClick={() => onChange(clamp(value - 1))}
          className="text-secondary-foreground hover:text-foreground p-1"
          aria-label="Menos celdas"
        >
          <Icon.minus />
        </button>
        <input
          type="number"
          min={1}
          max={max}
          value={value}
          onChange={(e) => onChange(clamp(parseInt(e.target.value, 10) || 1))}
          className="mono w-16 bg-transparent text-center text-base font-semibold text-foreground border-0 focus:shadow-none"
          aria-label="Celdas"
        />
        <button
          type="button"
          onClick={() => onChange(clamp(value + 1))}
          className="text-honey-light hover:text-foreground p-1"
          aria-label="Más celdas"
        >
          <Icon.plus />
        </button>
      </div>
    </div>
  )
}

/** Panel lateral para una publicación ajena: comprar al precio publicado u ofertar otro monto. */
export default function BuyPanel({
  listing,
  myOffer,
  busy,
  onBuy,
  onOffer,
  onWithdrawOffer,
}: BuyPanelProps) {
  const cur = listing.askCurrency
  const [units, setUnits] = useState(Math.min(1, listing.amount))
  const [offerUnits, setOfferUnits] = useState(myOffer?.amount ?? Math.min(1, listing.amount))
  const [offerPrice, setOfferPrice] = useState(
    myOffer ? String(myOffer.price) : String(listing.bestOfferPrice ?? listing.askPrice),
  )
  const price = toFloat(offerPrice.replace(",", "."), 0)
  const locked = busy !== null

  return (
    <Card tone="dark" className="p-[22px] flex flex-col gap-4">
      <div>
        <p className="label text-honey-light">Hexakey en venta</p>
        <h2 className="display text-xl font-bold mt-1 leading-tight">
          {listing.groupName}
        </h2>
        <p className="mono text-[11px] text-secondary-foreground mt-1">
          HEXAKEY #{listing.tokenId.toUpperCase()} · vende {listing.sellerName}
        </p>
        {listing.originalUnitPrice != null && (
          <p className="text-xs text-secondary-foreground mt-1">
            Precio original en el Panal: {formatPrice(listing.originalUnitPrice, cur)} {cur} por celda
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <UnitsStepper
          label={`Celdas a comprar (máx. ${listing.amount})`}
          value={units}
          max={listing.amount}
          onChange={setUnits}
        />
        <div className="flex justify-between p-3.5 bg-carbon rounded-xl text-[13px] font-bold">
          <span>
            {units} × {formatPrice(listing.askPrice, cur)} {cur}
          </span>
          <span className="mono text-honey-light">
            {formatPrice(units * listing.askPrice, cur)} {cur}
          </span>
        </div>
        <Button size="lg" block disabled={locked} onClick={() => onBuy(units)}>
          {busy === "buy" ? "Comprando..." : `Comprar ahora · ${formatPrice(units * listing.askPrice, cur)} ${cur}`}
        </Button>
      </div>

      <div className="h-px bg-border-dark" />

      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <p className="label text-honey-light">{myOffer ? "Tu oferta" : "Hacer una oferta"}</p>
          <span className="text-xs text-secondary-foreground">
            {listing.offersCount > 0
              ? `${listing.offersCount} ${listing.offersCount === 1 ? "oferta" : "ofertas"} · mejor ${formatPrice(listing.bestOfferPrice ?? 0, cur)} ${cur}`
              : "Nadie ha ofertado"}
          </span>
        </div>
        <UnitsStepper
          label="Celdas"
          value={offerUnits}
          max={listing.amount}
          onChange={setOfferUnits}
        />
        <label className="flex flex-col gap-1.5">
          <span className="label text-secondary-foreground">Monto por celda ({cur})</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={offerPrice}
            onChange={(e) => setOfferPrice(e.target.value)}
            className="mono h-11 bg-transparent border-[1.5px] border-olive rounded-xl px-3 text-foreground"
          />
        </label>
        <Button
          variant="secondary"
          block
          disabled={locked || !(price > 0)}
          onClick={() => onOffer({ amount: offerUnits, price })}
        >
          {busy === "offer"
            ? "Enviando..."
            : `${myOffer ? "Actualizar oferta" : "Enviar oferta"} · ${formatPrice(offerUnits * price, cur)} ${cur}`}
        </Button>
        {myOffer && (
          <Button variant="ghost" size="sm" disabled={locked} onClick={() => onWithdrawOffer(myOffer)}>
            {busy === "withdraw" ? "Retirando..." : "Retirar mi oferta"}
          </Button>
        )}
      </div>

      <p className="text-xs text-secondary-foreground leading-relaxed">
        Registro web2: al comprar, o cuando el vendedor acepta tu oferta, la Hexakey pasa a tu nombre en la
        colmena. On-chain sigue en custodia de la wallet master.
      </p>
    </Card>
  )
}
