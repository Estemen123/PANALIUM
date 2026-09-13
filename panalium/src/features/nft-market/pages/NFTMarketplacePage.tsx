import { useMemo, useState } from "react"
import {
  Button,
  Card,
  EmptyState,
  FilterChips,
  Page,
  PageHeader,
  useToast,
} from "@/shared/ui"
import { useNavigation } from "@/app/navigation"
import { useCurrentUser } from "@/features/auth"
import type { NFTListing } from "@/domain"
import { useActiveListings, useListingActions } from "../hooks/useListings"
import ListingCard from "../components/ListingCard"
import BuyPanel from "../components/BuyPanel"

type MarketFilter = "all" | "honey" | "mine"

interface MarketFilterOption {
  value: MarketFilter
  label: string
}

export default function NFTMarketplacePage() {
  const user = useCurrentUser()
  const { navigate } = useNavigation()
  const toast = useToast()
  const listings = useActiveListings()
  const { buyListing, cancelListing } = useListingActions()
  const [filter, setFilter] = useState<MarketFilter>("all")
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filters: MarketFilterOption[] = [
    { value: "all", label: `Todas las ofertas · ${listings.length}` },
    { value: "honey", label: "Solo en USDT" },
    { value: "mine", label: "Mis ofertas" },
  ]

  const visible = useMemo(() => {
    if (filter === "honey")
      return listings.filter((l) => l.askCurrency === "USDT")
    if (filter === "mine") return listings.filter((l) => l.sellerId === user.id)
    return listings
  }, [listings, filter, user.id])

  const selected: NFTListing | undefined = listings.find(
    (l) => l.id === selectedId && l.sellerId !== user.id,
  )

  return (
    <Page width="full">
      <PageHeader
        title="Mercado de Abejas"
        description="Compra y vende Hexakeys de Panales en tránsito. El precio lo fija cada Abeja; la Hexakey pasa a tu billetera al instante."
        actions={
          <Button
            variant="secondary"
            className="text-foreground"
            onClick={() => navigate("my-receipts")}
          >
            Vender una Hexakey
          </Button>
        }
      />
      <FilterChips
        options={filters}
        value={filter}
        onChange={setFilter}
        className="mb-5"
      />

      {visible.length === 0 ? (
        <EmptyState
          title="El Mercado está tranquilo"
          description="Ninguna Abeja vende Hexakeys ahora mismo. Vuelve más tarde o publica una tuya."
        />
      ) : (
        <div className="grid grid-cols-[1fr_1fr_1fr_0.95fr] gap-4 items-start">
          <div className="col-span-3 grid grid-cols-3 gap-4">
            {visible.map((lst) => (
              <ListingCard
                key={lst.id}
                listing={lst}
                userId={user.id}
                selected={selected?.id === lst.id}
                onSelect={(l) => setSelectedId(l.id)}
                onCancel={(l) => {
                  cancelListing(l.id)
                  toast("Oferta retirada del Mercado de Abejas.")
                }}
              />
            ))}
          </div>
          {selected ? (
            <BuyPanel
              key={selected.id}
              listing={selected}
              wallet={user.wallet}
              onConfirm={(units) => {
                const result = buyListing(selected, units)
                if (!result.ok) {
                  toast(result.error, "error")
                  return
                }
                setSelectedId(null)
                toast(
                  "Compra completada. La Hexakey ya vuela hacia tu billetera.",
                )
              }}
            />
          ) : (
            <Card
              tone="dark"
              className="p-6 text-center text-[13px] text-secondary-foreground leading-relaxed"
            >
              Elige una oferta para ver el desglose y confirmar la compra.
            </Card>
          )}
        </div>
      )}
    </Page>
  )
}
