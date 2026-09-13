import { percentage } from "@/shared/lib/number"
import { cn } from "@/shared/lib/cn"

export interface ProgressProps {
  value: number
  max: number
  /** Alto en píxeles (8 por defecto, 10 en detalles). */
  height?: number
  className?: string
}

/** Barra de llenado de miel. Al completarse pasa a verde oliva. */
export default function Progress({
  value,
  max,
  height = 8,
  className,
}: ProgressProps) {
  const pct = percentage(value, max)
  return (
    <div
      className={cn("progress-bar", className)}
      style={{ height }}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div
        className={cn("progress-fill", pct >= 100 && "progress-fill-complete")}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
