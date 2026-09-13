import type { ReactNode } from "react"
import { cn } from "@/shared/lib/cn"

export interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}

export default function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex items-end justify-between gap-6 mb-6", className)}>
      <div className="min-w-0">
        <h1 className="display text-[34px] font-extrabold tracking-tight leading-[1.05]">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-secondary-foreground mt-2 max-w-3xl">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="shrink-0 flex gap-2">{actions}</div>}
    </div>
  )
}
