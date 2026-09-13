import type { ReactNode } from "react"
import { cn } from "@/shared/lib/cn"

/** light → Recolectando · success → Panal lleno · primary → Néctar enviado · neutral → Sellado · outline → disuelto · dark → Importación */
export type BadgeVariant = "light" | "success" | "primary" | "neutral" | "outline" | "dark"

const VARIANTS: Record<BadgeVariant, string> = {
  light: "bg-honey-light text-brown",
  success: "bg-olive text-cream",
  primary: "bg-honey text-brown",
  neutral: "bg-beige text-brown",
  outline: "border border-beige text-muted-foreground",
  dark: "bg-brown text-honey-light",
}

export default function Badge({
  variant = "neutral",
  children,
  className,
}: {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap leading-none",
        VARIANTS[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
