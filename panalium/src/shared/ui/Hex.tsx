import type { CSSProperties, HTMLAttributes, ReactNode } from "react"
import { cn } from "@/shared/lib/cn"

export interface HexProps
  extends HTMLAttributes<HTMLDivElement> {
  /** Ancho en px; el alto se deriva (ratio 1 : 1,12). */
  /** Color de fondo (hex). Alternativa a una clase `bg-*`. */
  size: number
  children?: ReactNode
  color?: string
}

/** Hexágono de lados verticales: unidad visual de Panalium. Centra su contenido. */
export default function Hex({
  size,
  children,
  color,
  className,
  style,
  ...rest
}: HexProps) {
  const merged: CSSProperties = {
    width: size,
    height: Math.round(size * 1.12),
    background: color,
    ...style,
  }
  return (
    <div
      className={cn(
        "hex shrink-0 flex items-center justify-center overflow-hidden",
        className,
      )}
      style={merged}
      {...rest}
    >
      {children}
    </div>
  )
}
