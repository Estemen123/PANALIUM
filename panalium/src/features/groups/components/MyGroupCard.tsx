import { Badge, Card, Progress } from "@/shared/ui"
import { formatPrice } from "@/shared/lib/format"
import {
  groupProgress,
  isGroupCreator,
  memberEntry,
  memberSwarm,
  type BuyingGroup,
} from "@/domain"
import GroupStatusBadges from "./GroupStatusBadges"
import BuyMoreCellsButton from "./BuyMoreCellsButton"

export default function MyGroupCard({
  group,
  userId,
  onClick,
}: {
  group: BuyingGroup
  userId: string
  onClick?: () => void
}) {
  const entry = memberEntry(group, userId)
  const swarm = memberSwarm(group, userId)
  const info = [
    `${group.members.length} Abejas`,
    swarm?.name,
    group.deadline ? `cierra el ${group.deadline}` : null,
  ].filter(Boolean)
  return (
    <Card className="p-5" onClick={onClick}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="display text-lg font-bold">{group.productName}</h3>
            <GroupStatusBadges group={group} />
            {isGroupCreator(group, userId) && (
              <Badge variant="dark">Fundadora</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{info.join(" · ")}</p>
        </div>
        {entry && (
          <div className="text-right shrink-0">
            <p className="label">Tu aporte</p>
            <p className="mono font-semibold text-sm mt-0.5">
              {formatPrice(entry.paid, entry.currency)} {entry.currency}
            </p>
            <p className="text-xs text-muted-foreground">
              {entry.units} celdas
            </p>
          </div>
        )}
      </div>
      <Progress value={group.currentUnits} max={group.targetUnits} />
      <div className="flex justify-between text-xs mt-2 text-muted-foreground">
        <span className="mono">
          {group.currentUnits} / {group.targetUnits} celdas
        </span>
        <span>{groupProgress(group)}% lleno</span>
      </div>
      {entry && (
        <div className="flex justify-end mt-3">
          <BuyMoreCellsButton group={group} userId={userId} size="sm" />
        </div>
      )}
    </Card>
  )
}
