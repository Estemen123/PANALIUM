import { useMemo, useState } from "react"
import {
  Button,
  Card,
  EmptyState,
  FilterChips,
  InfoBanner,
  Page,
  PageHeader,
  useToast,
} from "@/shared/ui"
import { useNavigation } from "@/app/navigation"
import { useCurrentUser } from "@/features/auth"
import type { ActionResult } from "@/shared/lib/result"
import { useActiveListings, useListingActions, useMarketData } from "../hooks/useListings"
import ListingCard from "../components/ListingCard"
import BuyPanel from "../components/BuyPanel"
import SellerOffersPanel from "../components/SellerOffersPanel"
import RecentSales from "../components/RecentSales"

type MarketFilter = "others" | "mine" | "offered"

interface MarketFilterOption {
  value: MarketFilter
  label: string
}

export default function NFTMarketplacePage() {
  const user = useCurrentUser()
  const { navigate } = useNavigation()
  const toast = useToast()
  const listings = useActiveListings()
  const { sales, loading, error, refresh } = useMarketData()
  const actions = useListingActions()
  const [filter, setFilter] = useState<MarketFilter>("others")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const others = useMemo(() => listings.filter((l) => l.sellerId !== user.id), [listings, user.id])
  const mine = useMemo(() => listings.filter((l) => l.sellerId === user.id), [listings, user.id])
  const offered = useMemo(
    () => others.filter((l) => l.offers.some((o) => o.buyerId === user.id)),
    [others, user.id],
  )

  const filters: MarketFilterOption[] = [
    { value: "others", label: `En venta · ${others.length}` },
    { value: "mine", label: `Mis publicaciones · ${mine.length}` },
    { value: "offered", label: `Con mis ofertas · ${offered.length}` },
  ]
  const visible = filter === "mine" ? mine : filter === "offered" ? offered : others
  const selected = listings.find((l) => l.id === selectedId)
  const own = selected?.sellerId === user.id

  async function run(key: string, action: () => Promise<ActionResult>, success: string, deselect = false) {
    setBusy(key)
    const result = await action()
    setBusy(null)
    if (!result.ok) {
      toast(result.error, "error")
      return
    }
    if (deselect) setSelectedId(null)
    toast(success)
  }

  return (
    <Page width="full">
      <PageHeader
        title="Mercado de Abejas"
        description="Compra y vende Hexakeys entre Abejas. Quien vende fija el precio; quien compra puede pagar ese precio o hacer su propia oferta."
        actions={
          <>
            <Button variant="ghost" onClick={() => void refresh()} disabled={loading}>
              {loading ? "Actualizando..." : "Actualizar"}
            </Button>
            <Button variant="secondary" className="text-foreground" onClick={() => navigate("my-receipts")}>
              Vender una Hexakey
            </Button>
          </>
        }
      />

      <InfoBanner title="Registro web2." className="mb-5">
        Cada compra u oferta aceptada cambia el dueño de la Hexakey en la colmena (Firestore). On-chain todas
        siguen en custodia de la wallet master.
      </InfoBanner>

      {error && (
        <p className="text-xs font-semibold text-brown bg-honey-light rounded-lg px-3 py-2 mb-4" role="alert">
          {error}
        </p>
      )}

      <FilterChips options={filters} value={filter} onChange={setFilter} className="mb-5" />

      {visible.length === 0 ? (
        <EmptyState
          title={filter === "mine" ? "No tienes Hexakeys publicadas" : "El Mercado está tranquilo"}
          description={
            filter === "mine"
              ? "Ve a Mis Recibos NFT y pulsa Vender para publicar celdas de una Hexakey."
              : filter === "offered"
                ? "Todavía no has ofertado por ninguna Hexakey."
                : "Ninguna Abeja vende Hexakeys ahora mismo. Vuelve más tarde o publica una tuya."
          }
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
              />
            ))}
          </div>
          {selected && own ? (
            <SellerOffersPanel
              key={selected.id}
              listing={selected}
              busy={busy}
              onAccept={(offer) =>
                void run(
                  `accept-${offer.id}`,
                  () => actions.acceptOffer(selected, offer.id),
                  `Oferta aceptada: ${offer.amount} celdas pasaron a ${offer.buyerName}.`,
                  selected.amount - offer.amount <= 0,
                )
              }
              onReject={(offer) =>
                void run(`reject-${offer.id}`, () => actions.rejectOffer(selected, offer.id), "Oferta rechazada.")
              }
              onCancel={() => {
                if (window.confirm("¿Retirar esta Hexakey del Mercado? Las ofertas pendientes se cerrarán.")) {
                  void run("cancel", () => actions.cancelListing(selected), "Publicación retirada del Mercado.", true)
                }
              }}
            />
          ) : selected ? (
            <BuyPanel
              key={selected.id}
              listing={selected}
              myOffer={selected.offers.find((o) => o.buyerId === user.id)}
              busy={busy}
              onBuy={(units) =>
                void run(
                  "buy",
                  () => actions.buyListing(selected, units),
                  "Compra completada. La Hexakey ya está en tus Recibos NFT.",
                  selected.amount - units <= 0,
                )
              }
              onOffer={(input) =>
                void run("offer", () => actions.makeOffer(selected, input), "Oferta enviada al vendedor.")
              }
              onWithdrawOffer={(offer) =>
                void run("withdraw", () => actions.withdrawOffer(selected, offer.id), "Oferta retirada.")
              }
            />
          ) : (
            <Card tone="dark" className="p-6 text-center text-[13px] text-secondary-foreground leading-relaxed">
              Elige una publicación para comprarla, ofertar o, si es tuya, ver las ofertas que recibiste.
            </Card>
          )}
        </div>
      )}

      <RecentSales sales={sales} />
    </Page>
  )
}
