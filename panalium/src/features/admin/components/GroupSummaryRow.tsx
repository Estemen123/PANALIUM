import type { BuyingGroup } from "@/domain"
import { GroupStatusBadges } from "@/features/groups"

export default function GroupSummaryRow({ group }: { group: BuyingGroup }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 bg-surface border border-border rounded-2xl">
      <div className="min-w-0">
        <p className="text-sm font-bold truncate">{group.productName}</p>
        <p className="text-xs text-muted-foreground">
          {group.creatorName} · {group.members.length} Abejas ·{" "}
          {group.swarms.length} Enjambres
        </p>
      </div>
      <GroupStatusBadges group={group} />
    </div>
  )
}
