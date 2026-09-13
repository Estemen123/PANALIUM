import Hex from "./Hex"
import { COLORS } from "@/shared/config/theme"
import { cn } from "@/shared/lib/cn"

export interface HexProgressProps {
  filled: number
  total: number
  /** Celdas dibujadas (el progreso se escala a este número). */
  cells?: number
  size?: number
  /** Color de las celdas vacías (beige sobre crema, oliva sobre carbón). */
  emptyColor?: string
  className?: string
}

/** Progreso por celdas: hilera de hexágonos que se van llenando de miel. */
export default function HexProgress({
  filled,
  total,
  cells = 10,
  size = 24,
  emptyColor = COLORS.beige,
  className,
}: HexProgressProps) {
  const lit =
    total > 0 ? Math.round((Math.min(filled, total) / total) * cells) : 0
  return (
    <div
      className={cn("flex gap-1", className)}
      role="progressbar"
      aria-valuenow={filled}
      aria-valuemin={0}
      aria-valuemax={total}
    >
      {Array.from({ length: cells }, (_, i) => (
        <Hex key={i} size={size} color={i < lit ? COLORS.honey : emptyColor} />
      ))}
    </div>
  )
}
