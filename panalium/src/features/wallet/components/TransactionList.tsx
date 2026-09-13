import { Card, Hex } from "@/shared/ui"
import { isIncoming, TRANSACTION_META, type Transaction } from "@/domain"
import { formatPrice } from "@/shared/lib/format"

export default function TransactionList({
  transactions,
}: {
  transactions: Transaction[]
}) {
  return (
    <Card className="divide-y divide-border">
      {transactions.map((t) => {
        const meta = TRANSACTION_META[t.type]
        const incoming = isIncoming(t)
        return (
          <div key={t.id} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Hex size={32} color={meta.color}>
                <span className="text-xs font-bold text-brown">
                  {meta.glyph}
                </span>
              </Hex>
              <div>
                <p className="text-sm font-bold">{t.label}</p>
                <p className="text-xs text-muted-foreground">{t.date}</p>
              </div>
            </div>
            <span
              className={`mono text-sm font-semibold ${
                incoming ? "text-olive" : "text-brown"
              }`}
            >
              {incoming ? "+" : "−"}
              {formatPrice(Math.abs(t.amount), t.currency)} {t.currency}
            </span>
          </div>
        )
      })}
    </Card>
  )
}
