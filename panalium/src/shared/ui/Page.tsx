import type { ReactNode } from "react"
import { cn } from "@/shared/lib/cn"

export type PageWidth = "sm" | "md" | "lg" | "xl" | "full"
const WIDTHS: Record<PageWidth, string> = {
  sm: "max-w-2xl",
  md: "max-w-3xl",
  lg: "max-w-5xl",
  xl: "max-w-6xl",
  full: "",
}

/** Contenedor de pantalla: relleno estándar y ancho máximo. */
export default function Page({
  children,
  width = "xl",
  className,
}: {
  children: ReactNode
  width?: PageWidth
  className?: string
}) {
  return (
    <div className={cn("px-10 py-9", WIDTHS[width], className)}>{children}</div>
  )
}
