import { Avatar, Badge, Button, Card, Hex } from "@/shared/ui"
import { COLORS } from "@/shared/config/theme"
import { formatPrice } from "@/shared/lib/format"
import { isOwnListing, type NFTListing } from "@/domain"

export interface ListingCardProps {
  listing: NFTListing
  userId: string
  selected?: boolean
  onSelect: (listing: NFTListing) => void
  onCancel: (listing: NFTListing) => void
}

/** Oferta de una Hexakey en el Mercado de Abejas. */
export default function ListingCard({
  listing,
  userId,
  selected,
  onSelect,
  onCancel,
}: ListingCardProps) {
  const own = isOwnListing(listing, userId)
  return (
    <Card
      className="p-[18px] flex flex-col gap-3.5"
      selected={selected}
      interactive={!own}
      onClick={own ? undefined : () => onSelect(listing)}
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
            {formatPrice(listing.askPrice, listing.askCurrency)}{" "}
            <span className="text-[13px] text-muted-foreground">
              {listing.askCurrency}
            </span>
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

      <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {own ? (
            <Badge variant="light">Tu oferta</Badge>
          ) : (
            <Avatar
              name={listing.sellerName}
              seed={listing.sellerId}
              size={20}
            />
          )}
          <span>
            {own
              ? `Publicada el ${listing.createdAt}`
              : `Abeja vendedora: ${listing.sellerName}`}
          </span>
        </div>
        <span>Llega el {listing.supplierETA}</span>
      </div>

      {own ? (
        <Button
          variant="secondary"
          className="mt-auto"
          onClick={() => onCancel(listing)}
        >
          Retirar oferta
        </Button>
      ) : (
        <Button className="mt-auto" onClick={() => onSelect(listing)}>
          Comprar Hexakey
        </Button>
      )}
    </Card>
  )
}
