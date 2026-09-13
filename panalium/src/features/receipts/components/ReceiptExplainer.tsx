import { InfoBanner } from "@/shared/ui"
import { Icon } from "@/shared/icons/Icon"
import type { ERC1155Token } from "@/domain"
import { countByStatus } from "@/domain"

export default function ReceiptExplainer({
  tokens,
}: {
  tokens: ERC1155Token[]
}) {
  const counts = countByStatus(tokens)
  return (
    <InfoBanner
      title="¿Qué es una Hexakey?"
      icon={<Icon.key size={16} />}
      className="mb-5"
      aside={
        <div className="flex gap-4 text-xs text-secondary-foreground whitespace-nowrap">
          <span>
            <span className="mono font-semibold text-honey-light">
              {counts.held}
            </span>{" "}
            en custodia
          </span>
          <span>
            <span className="mono font-semibold text-honey-light">
              {counts.listed}
            </span>{" "}
            en venta
          </span>
          <span>
            <span className="mono font-semibold text-honey-light">
              {counts.burned}
            </span>{" "}
            reclamadas
          </span>
        </div>
      }
    >
      Es la llave de tu compra. Cuando llega el producto la{" "}
      <span className="text-foreground font-semibold">reclamas</span> (la
      Hexakey se quema y retiras la mercancía) o, si necesitas USDT antes, la{" "}
      <span className="text-foreground font-semibold">
        vendes en el Mercado de Abejas
      </span>
      .
    </InfoBanner>
  )
}
