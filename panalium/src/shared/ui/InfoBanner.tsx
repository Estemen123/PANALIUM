import type { ReactNode } from "react"
import Hex from "./Hex"
import { COLORS } from "@/shared/config/theme"
import { cn } from "@/shared/lib/cn"

export interface InfoBannerProps {
  title?: string
  icon?: ReactNode
  children: ReactNode
  /** Contenido alineado a la derecha (contadores, enlaces). */
  aside?: ReactNode
  className?: string
}

/** Franja explicativa sobre fondo marrón carbón con icono en hexágono miel. */
export default function InfoBanner({
  title,
  icon,
  children,
  aside,
  className,
}: InfoBannerProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 px-4 py-3.5 bg-elevated border border-olive rounded-2xl text-[13px] text-secondary-foreground leading-relaxed",
        className,
      )}
    >
      {icon && (
        <Hex size={34} color={COLORS.honey} className="text-brown">
          {icon}
        </Hex>
      )}
      <div className="min-w-0">
        {title && <span className="font-bold text-honey-light">{title} </span>}
        {children}
      </div>
      {aside && <div className="ml-auto shrink-0">{aside}</div>}
    </div>
  )
}
