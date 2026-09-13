import { Button } from "@/shared/ui"
import { cn } from "@/shared/lib/cn"
import {
  canBurnToken,
  canSellToken,
  TOKEN_STATUS_META,
  type ERC1155Token,
} from "@/domain"
import HexakeyTag from "./HexakeyTag"

export interface HexakeyCardProps {
  token: ERC1155Token
  /** Fecha estimada de llegada del Panal, si se conoce. */
  eta?: string
  /** El Panal ya llegó: la Hexakey puede reclamarse. */
  arrived?: boolean
  /** Precio de la oferta activa, si la Hexakey está en venta. */
  listedPriceLabel?: string
  onClaim: (token: ERC1155Token) => void
  onSell: (token: ERC1155Token) => void
  onViewMarket: () => void
}

/** Tarjeta hexagonal de una Hexakey en la galería de Mis Recibos NFT. */
export default function HexakeyCard({
  token,
  eta,
  arrived = false,
  listedPriceLabel,
  onClaim,
  onSell,
  onViewMarket,
}: HexakeyCardProps) {
  const status = TOKEN_STATUS_META[token.status]
  const burned = token.status === "burned"
  const listed = token.status === "listed"
  const statusLabel = !burned && arrived ? "Lista para reclamar" : status.label
  const note = burned
    ? "Producto reclamado"
    : listed && listedPriceLabel
      ? `Publicada a ${listedPriceLabel}`
      : eta
        ? arrived
          ? `Llegó el ${eta}`
          : `Llega el ${eta} · en tránsito`
        : "En tránsito"

  return (
    <div
      className={cn(
        "w-[236px] flex flex-col items-center gap-3",
        burned && "opacity-55",
      )}
    >
      <div className="hex relative w-[236px] h-[264px] flex flex-col justify-end items-center px-10 pb-6 bg-brown">
        <img
          src={token.productImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brown via-brown/40 to-transparent" />
        <div className="absolute top-4 left-0 right-0 flex justify-center">
          <HexakeyTag />
        </div>
        <div className="absolute top-[58px] left-0 right-0 flex justify-center">
          <span
            className="text-[10px] font-bold px-2.5 py-1 rounded-full"
            style={{
              background: arrived && !burned ? "#F8D66D" : status.bg,
              color: arrived && !burned ? "#29251F" : status.fg,
            }}
          >
            {statusLabel}
          </span>
        </div>
        <p className="relative text-[15px] font-bold text-cream leading-tight text-center">
          {token.groupName}
        </p>
        <p className="relative mono text-xs text-honey-light text-center mt-1.5">
          #{token.tokenId.toUpperCase()} · {token.amount} celdas
        </p>
      </div>

      <p className="text-xs text-secondary-foreground text-center">{note}</p>

      <div className="flex gap-2">
        {listed ? (
          <Button
            variant="secondary"
            size="sm"
            className="text-foreground"
            onClick={onViewMarket}
          >
            Ver en el Mercado
          </Button>
        ) : burned ? (
          <Button variant="ghost" size="sm" className="text-faint">
            Ver certificado
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              disabled={!arrived || !canBurnToken(token)}
              onClick={() => onClaim(token)}
            >
              Reclamar
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="text-foreground"
              disabled={!canSellToken(token)}
              onClick={() => onSell(token)}
            >
              Vender
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
