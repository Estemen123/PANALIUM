import { Card, Hex, Progress } from "@/shared/ui"
import { COLORS } from "@/shared/config/theme"
import { formatPrice } from "@/shared/lib/format"
import type { BuyingGroup } from "@/domain"
import GroupStatusBadges from "./GroupStatusBadges"

export interface GroupCardProps {
  group: BuyingGroup
  selected?: boolean
  onClick: () => void
}

/** Tarjeta de un Panal en el listado. */
export default function GroupCard({
  group,
  selected,
  onClick,
}: GroupCardProps) {
  const meta = [
    group.supplierName,
    `${group.swarms.length} Enjambres`,
    `${group.members.length} Abejas`,
  ]
  if (group.eta) meta.push(`llega el ${group.eta}`)
  return (
    <Card className="p-3.5 flex gap-3.5" onClick={onClick} selected={selected}>
      <Hex size={72} color={COLORS.olive}>
        {group.imageUrl && (
          <img
            src={group.imageUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        )}
      </Hex>
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[15px] font-bold leading-snug truncate">
            {group.productName}
          </h3>
          <GroupStatusBadges group={group} />
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {meta.filter(Boolean).join(" · ")}
        </p>
        <Progress value={group.currentUnits} max={group.targetUnits} />
        <div className="flex justify-between text-xs">
          <span className="mono text-muted-foreground">
            {group.currentUnits} / {group.targetUnits} celdas
          </span>
          <span className="mono font-semibold">
            {formatPrice(group.unitPrice, group.currency)} {group.currency} /
            celda
          </span>
        </div>
      </div>
    </Card>
  )
}
