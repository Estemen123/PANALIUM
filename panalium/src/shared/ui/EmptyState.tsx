import type { ReactNode } from "react"
import Card from "./Card"
import Hex from "./Hex"
import { COLORS } from "@/shared/config/theme"

export default function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <Card className="p-12 text-center flex flex-col items-center gap-3">
      <Hex size={40} color={COLORS.beige} />
      <p className="display text-lg font-bold">{title}</p>
      {description && (
        <p className="text-[13px] text-muted-foreground max-w-md">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </Card>
  )
}
