import { Avatar, Button, Card } from "@/shared/ui"
import { formatPrice } from "@/shared/lib/format"
import type { MarketOffer, NFTListing } from "@/domain"

export interface SellerOffersPanelProps {
  listing: NFTListing
  busy: string | null
  onAccept: (offer: MarketOffer) => void
  onReject: (offer: MarketOffer) => void
  onCancel: () => void
}

/** Panel del vendedor: ofertas recibidas por su publicación, para aceptarlas o rechazarlas. */
export default function SellerOffersPanel({
  listing,
  busy,
  onAccept,
  onReject,
  onCancel,
}: SellerOffersPanelProps) {
  const cur = listing.askCurrency
  const locked = busy !== null

  return (
    <Card tone="dark" className="p-[22px] flex flex-col gap-4">
      <div>
        <p className="label text-honey-light">Tu publicación</p>
        <h2 className="display text-xl font-bold mt-1 leading-tight">
          {listing.groupName}
        </h2>
        <p className="mono text-[11px] text-secondary-foreground mt-1">
          HEXAKEY #{listing.tokenId.toUpperCase()} · {listing.amount} de {listing.initialAmount} celdas a{" "}
          {formatPrice(listing.askPrice, cur)} {cur}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <p className="label text-secondary-foreground">
          Ofertas recibidas ({listing.offers.length})
        </p>
        {listing.offers.length === 0 ? (
          <p className="text-[13px] text-secondary-foreground p-3.5 bg-carbon rounded-xl">
            Todavía nadie ha ofertado. Las Abejas también pueden comprar directo al precio que publicaste.
          </p>
        ) : (
          listing.offers.map((offer) => {
            const fits = offer.amount <= listing.amount
            const diff = offer.price - listing.askPrice
            return (
              <div key={offer.id} className="p-3.5 bg-carbon rounded-xl flex flex-col gap-2.5">
                <div className="flex items-center gap-2.5">
                  <Avatar name={offer.buyerName} seed={offer.buyerId} size={28} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold truncate">{offer.buyerName}</p>
                    <p className="mono text-[11px] text-secondary-foreground">
                      {offer.amount} × {formatPrice(offer.price, cur)} = {formatPrice(offer.amount * offer.price, cur)} {cur}
                    </p>
                  </div>
                  <span className={diff >= 0 ? "text-[11px] font-bold text-honey-light" : "text-[11px] text-secondary-foreground"}>
                    {diff >= 0 ? "+" : ""}
                    {formatPrice(diff, cur)}
                  </span>
                </div>
                {!fits && (
                  <p className="text-[11px] text-secondary-foreground">
                    Pide {offer.amount} celdas y solo te quedan {listing.amount}.
                  </p>
                )}
                <div className="flex gap-2">
                  <Button size="sm" disabled={locked || !fits} onClick={() => onAccept(offer)}>
                    {busy === `accept-${offer.id}` ? "Traspasando..." : "Aceptar"}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={locked}
                    onClick={() => onReject(offer)}
                  >
                    {busy === `reject-${offer.id}` ? "Rechazando..." : "Rechazar"}
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="h-px bg-border-dark" />
      <Button variant="secondary" disabled={locked} onClick={onCancel}>
        {busy === "cancel" ? "Retirando..." : "Retirar del Mercado"}
      </Button>
      <p className="text-xs text-secondary-foreground leading-relaxed">
        Al aceptar una oferta, esas celdas pasan a la otra Abeja al precio ofertado. Si retiras la publicación,
        las celdas que queden vuelven a tu galería y las ofertas pendientes se cierran.
      </p>
    </Card>
  )
}
