import { Button } from "@/shared/ui"
import type { BuyingGroup } from "@/domain"
import { GroupStatusBadges } from "@/features/groups"

export interface GroupSummaryRowProps {
  group: BuyingGroup
  onManage?: () => void
}

export default function GroupSummaryRow({ group, onManage }: GroupSummaryRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 bg-surface border border-border rounded-2xl">
      <div className="min-w-0">
        <p className="text-sm font-bold truncate">{group.productName}</p>
        <p className="text-xs text-muted-foreground">
          {group.creatorName} · {group.members.length} Abejas ·{" "}
          {group.currentUnits}/{group.targetUnits} celdas
          {group.paidUnits ? ` · ${group.paidUnits} pagadas` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <GroupStatusBadges group={group} />
        {onManage && (
          <Button size="sm" variant="secondary" className="text-foreground" onClick={onManage}>
            Gestionar
          </Button>
        )}
      </div>
    </div>
  )
}
