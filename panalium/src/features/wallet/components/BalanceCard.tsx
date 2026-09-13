import { Card, Hex } from "@/shared/ui"

export interface BalanceCardProps {
  symbol: string
  name: string
  subtitle: string
  value: string
  color: string
}

export default function BalanceCard({
  symbol,
  name,
  subtitle,
  value,
  color,
}: BalanceCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2.5 mb-3">
        <Hex size={30} color={color}>
          <span className="text-[11px] font-extrabold text-brown">
            {symbol}
          </span>
        </Hex>
        <span className="text-sm font-bold text-muted-foreground">{name}</span>
      </div>
      <p className="mono text-3xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
    </Card>
  )
}
