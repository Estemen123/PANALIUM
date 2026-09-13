import { useMemo, useState } from "react"
import {
  Button,
  EmptyState,
  FilterChips,
  Page,
  PageHeader,
  useToast,
} from "@/shared/ui"
import { formatPrice } from "@/shared/lib/format"
import { today } from "@/shared/lib/date"
import { useAppState } from "@/store"
import { useNavigation } from "@/app/navigation"
import type { ERC1155Token, TokenStatus } from "@/domain"
import { useMyTokens, useReceiptActions } from "../hooks/useReceipts"
import ReceiptExplainer from "../components/ReceiptExplainer"
import HexakeyCard from "../components/HexakeyCard"
import SellReceiptModal from "../components/SellReceiptModal"
import ClaimReceiptModal from "../components/ClaimReceiptModal"

type StatusFilter = TokenStatus | "all"

interface FilterOptionItem {
  value: StatusFilter
  label: string
}

const FILTERS: FilterOptionItem[] = [
  { value: "all", label: "Todas" },
  { value: "held", label: "En custodia" },
  { value: "listed", label: "En venta" },
  { value: "burned", label: "Reclamadas" },
]

export default function MyReceiptsPage() {
  const { navigate } = useNavigation()
  const toast = useToast()
  const { groups, listings } = useAppState()
  const myTokens = useMyTokens()
  const { sellToken, burnToken } = useReceiptActions()
  const [filter, setFilter] = useState<StatusFilter>("all")
  const [selling, setSelling] = useState<ERC1155Token | null>(null)
  const [claiming, setClaiming] = useState<ERC1155Token | null>(null)

  const visible = useMemo(
    () =>
      filter === "all" ? myTokens : myTokens.filter((t) => t.status === filter),
    [myTokens, filter],
  )
  const now = today()

  function cardProps(token: ERC1155Token) {
    const group = groups.find((g) => g.id === token.groupId)
    const eta = group?.eta ?? token.supplierETA
    const listing = listings.find(
      (l) =>
        l.tokenId === token.tokenId &&
        l.sellerId === token.ownerId &&
        l.listingStatus === "active",
    )
    return {
      eta,
      arrived: Boolean(eta) && eta <= now,
      listedPriceLabel: listing
        ? `${formatPrice(listing.askPrice, listing.askCurrency)} ${listing.askCurrency} / celda`
        : undefined,
    }
  }

  return (
    <Page width="full">
      <PageHeader
        title="Mis Recibos NFT"
        description="Tus Hexakeys: cada una es un token ERC-1155 que certifica tus celdas en un Panal ya pagado."
        actions={
          <Button
            variant="secondary"
            className="text-foreground"
            onClick={() => navigate("nft-marketplace")}
          >
            Ir al Mercado de Abejas
          </Button>
        }
      />
      <ReceiptExplainer tokens={myTokens} />
      <FilterChips
        options={FILTERS}
        value={filter}
        onChange={setFilter}
        className="mb-6"
      />

      {visible.length === 0 ? (
        <EmptyState
          title="Ninguna Hexakey aquí todavía"
          description="Tus Hexakeys aparecerán cuando un Panal tuyo envíe el néctar al proveedor."
        />
      ) : (
        <div className="flex flex-wrap gap-6 items-start">
          {visible.map((tok, i) => (
            <div key={tok.id} className={i % 2 === 1 ? "mt-[132px]" : ""}>
              <HexakeyCard
                token={tok}
                {...cardProps(tok)}
                onClaim={setClaiming}
                onSell={setSelling}
                onViewMarket={() => navigate("nft-marketplace")}
              />
            </div>
          ))}
        </div>
      )}

      {selling && (
        <SellReceiptModal
          token={selling}
          onClose={() => setSelling(null)}
          onSubmit={(input) => {
            const result = sellToken(selling, input)
            if (!result.ok) {
              toast(result.error, "error")
              return
            }
            setSelling(null)
            toast("Tu Hexakey ya está en el Mercado de Abejas.")
          }}
        />
      )}
      {claiming && (
        <ClaimReceiptModal
          token={claiming}
          onClose={() => setClaiming(null)}
          onConfirm={() => {
            burnToken(claiming)
            setClaiming(null)
            toast(
              "Producto reclamado. Tu Hexakey pasó a la historia de la colmena.",
            )
          }}
        />
      )}
    </Page>
  )
}
