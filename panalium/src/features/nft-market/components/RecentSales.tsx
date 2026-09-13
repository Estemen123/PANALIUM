import { Badge, Card } from "@/shared/ui"
import { formatPrice } from "@/shared/lib/format"
import type { MarketSale } from "@/domain"

/** Últimos traspasos del Mercado de Abejas. */
export default function RecentSales({ sales }: { sales: MarketSale[] }) {
  if (sales.length === 0) return null
  return (
    <Card className="p-6 mt-6 flex flex-col gap-3">
      <h2 className="display text-xl font-bold">Últimas ventas</h2>
      <div className="flex flex-col divide-y divide-border">
        {sales.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-4 py-2.5 text-[13px]">
            <div className="min-w-0">
              <p className="font-bold truncate">
                {s.groupName} <span className="mono text-[11px] text-muted-foreground">#{s.tokenId}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {s.sellerName} → {s.buyerName} · {new Date(s.createdAt).toLocaleString("es-VE", { dateStyle: "short", timeStyle: "short" })}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Badge variant={s.via === "oferta" ? "dark" : "light"}>
                {s.via === "oferta" ? "Oferta aceptada" : "Compra directa"}
              </Badge>
              <span className="mono">
                {s.units} × {formatPrice(s.price, "USDC")} = <strong>{formatPrice(s.total, "USDC")} USDC</strong>
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
