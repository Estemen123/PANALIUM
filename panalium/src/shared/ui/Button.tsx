import type { ButtonHTMLAttributes, ReactNode } from "react"
import { cn } from "@/shared/lib/cn"

/**
 * primary   → acción principal (amarillo miel). Una por pantalla.
 * secondary → contorno que hereda el color del texto (funciona en crema y en carbón).
 * ghost     → solo texto.
 * accent    → oliva sólido, confirma un estado completado.
 * danger    → destructivo: marrón carbón con texto miel claro (quemar, disolver).
 */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "accent" | "danger"
export type ButtonSize = "sm" | "md" | "lg"

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  /** Ocupa todo el ancho y centra el contenido. */
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  type?: "button" | "submit"
  block?: boolean
}

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 text-[13px] px-3.5",
  md: "h-11 text-sm px-5",
  lg: "h-[52px] text-base px-7",
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
  secondary: "border-[1.5px] border-current bg-transparent hover:bg-current/5",
  ghost: "text-muted-foreground hover:text-current bg-transparent",
  accent: "bg-accent text-accent-foreground hover:opacity-90",
  danger: "bg-elevated text-honey-light hover:bg-carbon",
}

export default function Button({
  children,
  variant = "primary",
  size = "md",
  type = "button",
  block = false,
  disabled,
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer active:scale-[0.98]",
        SIZES[size],
        VARIANTS[variant],
        block && "w-full",
        disabled && "opacity-40 pointer-events-none",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
