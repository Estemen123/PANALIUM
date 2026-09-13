import { Badge, type BadgeVariant } from "@/shared/ui"
import {
  GROUP_STATUS_LABELS,
  type BuyingGroup,
  type GroupStatus,
} from "@/domain"

const STATUS_VARIANT: Record<GroupStatus, BadgeVariant> = {
  open: "light",
  funded: "success",
  paid_to_supplier: "primary",
  closed: "neutral",
  cancelled: "outline",
}

export function GroupStatusBadge({ status }: { status: GroupStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status]}>
      {GROUP_STATUS_LABELS[status]}
    </Badge>
  )
}

/** Etiqueta de estado más la marca "Importación" cuando aplica. */
export default function GroupStatusBadges({ group }: { group: BuyingGroup }) {
  return (
    <div className="flex gap-1.5 shrink-0">
      {group.type === "international" && (
        <Badge variant="dark">Importación</Badge>
      )}
      <GroupStatusBadge status={group.status} />
    </div>
  )
}
