import { Avatar, Badge, Button, Card, Hex } from "@/shared/ui"
import { COLORS } from "@/shared/config/theme"
import { formatPrice } from "@/shared/lib/format"
import { isOwnListing, type NFTListing } from "@/domain"

export interface ListingCardProps {
  listing: NFTListing
  userId: string
  selected?: boolean
  onSelect: (listing: NFTListing) => void
}

/** Publicación de una Hexakey en el Mercado de Abejas. */
export default function ListingCard({
  listing,
  userId,
  selected,
  onSelect,
}: ListingCardProps) {
  const own = isOwnListing(listing, userId)
  const myOffer = own ? undefined : listing.offers.find((o) => o.buyerId === userId)
  const cur = listing.askCurrency

  return (
    <Card
      className="p-[18px] flex flex-col gap-3.5"
      selected={selected}
      onClick={() => onSelect(listing)}
    >
      <div className="flex items-center gap-3">
        <Hex size={64} color={COLORS.olive}>
          <img
            src={listing.productImage}
            alt=""
            className="w-full h-full object-cover"
          />
        </Hex>
        <div className="min-w-0">
          <p className="text-[15px] font-bold leading-tight">
            {listing.groupName}
          </p>
          <p className="mono text-[11px] text-muted-foreground mt-1">
            HEXAKEY #{listing.tokenId.toUpperCase()}
          </p>
        </div>
      </div>

      <div className="flex justify-between items-end">
        <div>
          <p className="label">Precio por celda</p>
          <p className="mono text-[26px] font-semibold leading-tight mt-1">
            {formatPrice(listing.askPrice, cur)}{" "}
            <span className="text-[13px] text-muted-foreground">{cur}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="label">Disponibles</p>
          <p className="mono text-xl font-semibold mt-1">
            {listing.amount}{" "}
            <span className="text-xs text-muted-foreground">celdas</span>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {listing.offersCount > 0 ? (
          <Badge variant="primary">
            {listing.offersCount} {listing.offersCount === 1 ? "oferta" : "ofertas"} · mejor{" "}
            {formatPrice(listing.bestOfferPrice ?? 0, cur)}
          </Badge>
        ) : (
          <Badge variant="outline">Sin ofertas todavía</Badge>
        )}
        {myOffer && (
          <Badge variant="dark">
            Tu oferta: {myOffer.amount} × {formatPrice(myOffer.price, cur)}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {own ? (
          <Badge variant="light">Tu publicación</Badge>
        ) : (
          <Avatar name={listing.sellerName} seed={listing.sellerId} size={20} />
        )}
        <span className="truncate">
          {own ? `${listing.initialAmount - listing.amount} de ${listing.initialAmount} celdas vendidas` : `Vende ${listing.sellerName}`}
        </span>
      </div>

      <Button
        className="mt-auto"
        variant={own ? "secondary" : "primary"}
        onClick={(e) => {
          e.stopPropagation()
          onSelect(listing)
        }}
      >
        {own
          ? `Ver ofertas${listing.offersCount ? ` (${listing.offersCount})` : ""}`
          : "Comprar u ofertar"}
      </Button>
    </Card>
  )
}
