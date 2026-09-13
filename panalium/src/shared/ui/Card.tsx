import type { HTMLAttributes, ReactNode } from "react"
import { cn } from "@/shared/lib/cn"

export type CardTone = "cream" | "dark" | "surface"

export interface CardProps
  extends HTMLAttributes<HTMLDivElement> {
  /** cream (por defecto) sobre carbón · dark para paneles destacados · surface (blanco) dentro de una tarjeta crema. */
  /** Elevación al pasar el cursor. Implícito cuando hay `onClick`. */
  /** Borde miel para marcar la tarjeta seleccionada. */
  children: ReactNode
  tone?: CardTone
  interactive?: boolean
  selected?: boolean
}

const TONES: Record<CardTone, string> = {
  cream: "bg-card text-card-foreground border-border",
  dark: "bg-elevated text-foreground border-olive",
  surface: "bg-surface text-card-foreground border-border",
}

export default function Card({
  children,
  className,
  onClick,
  interactive,
  selected,
  tone = "cream",
  ...rest
}: CardProps) {
  const clickable = interactive ?? Boolean(onClick)
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-2xl border",
        TONES[tone],
        clickable && "card-hover cursor-pointer",
        selected && "border-2 border-primary",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}
