import type { ReactNode } from "react"
import Card from "./Card"

export interface StatCardProps {
  label: string
  value: ReactNode
  sub?: string
  /** Sufijo pequeño junto al valor (p. ej. "USDC"). */
  unit?: string
}

export default function StatCard({ label, value, sub, unit }: StatCardProps) {
  return (
    <Card className="p-5 flex flex-col justify-between gap-3 min-h-[124px]">
      <p className="label">{label}</p>
      <p className="mono text-[32px] font-semibold leading-none">
        {value}
        {unit && (
          <span className="text-sm text-muted-foreground ml-1.5">{unit}</span>
        )}
      </p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </Card>
  )
}
