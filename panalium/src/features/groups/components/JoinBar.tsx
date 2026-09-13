import { useState } from "react"
import { Button } from "@/shared/ui"
import { Icon } from "@/shared/icons/Icon"
import { formatPrice } from "@/shared/lib/format"
import type { BuyingGroup, JoinGroupInput, Swarm } from "@/domain"

export interface JoinBarProps {
  group: BuyingGroup
  swarm: Swarm
  maxUnits: number
  onJoin: (input: JoinGroupInput) => void
}

/** Franja inferior del detalle: elegir celdas y unirse al Enjambre seleccionado. */
export default function JoinBar({
  group,
  swarm,
  maxUnits,
  onJoin,
}: JoinBarProps) {
  const [units, setUnits] = useState(Math.min(10, Math.max(1, maxUnits)))
  const clamp = (n: number) => Math.min(maxUnits, Math.max(1, n))
  const total = units * group.unitPrice

  return (
    <div className="mt-auto flex items-center justify-between gap-4 px-4 py-3.5 bg-elevated rounded-2xl text-foreground">
      <div className="min-w-0">
        <p className="label text-honey-light">Unirte a este Panal</p>
        <p className="text-[13px] text-secondary-foreground mt-0.5">
          Cada celda son {formatPrice(group.unitPrice, group.currency)}{" "}
          {group.currency}. Si el Panal no se llena, tus USDC vuelven a tu
          reserva.
        </p>
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="h-10 border-[1.5px] border-olive rounded-xl flex items-center px-2 gap-2">
          <button
            type="button"
            onClick={() => setUnits((u) => clamp(u - 1))}
            className="text-secondary-foreground hover:text-foreground p-1"
            aria-label="Menos celdas"
          >
            <Icon.minus />
          </button>
          <input
            type="number"
            min={1}
            max={maxUnits}
            value={units}
            onChange={(e) => setUnits(clamp(parseInt(e.target.value, 10) || 1))}
            className="mono w-12 bg-transparent text-center text-sm font-semibold text-foreground border-0 focus:shadow-none"
            aria-label="Celdas"
          />
          <button
            type="button"
            onClick={() => setUnits((u) => clamp(u + 1))}
            className="text-honey-light hover:text-foreground p-1"
            aria-label="Más celdas"
          >
            <Icon.plus />
          </button>
        </div>
        <Button
          onClick={() =>
            onJoin({ swarmId: swarm.id, units, currency: group.currency })
          }
        >
          Unirme al {swarm.name} · {formatPrice(total, group.currency)}{" "}
          {group.currency}
        </Button>
      </div>
    </div>
  )
}
