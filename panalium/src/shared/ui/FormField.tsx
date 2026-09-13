import type { ReactNode } from "react"

export interface FormFieldProps {
  label: string
  children: ReactNode
  hint?: string
}

/** Etiqueta + control, compartido por Input, Textarea y Select. */
export default function FormField({ label, children, hint }: FormFieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}

/** Clases base de todo control de formulario. Fondo blanco sobre crema, borde beige, foco miel. */
export const CONTROL_CLASS =
  "h-11 bg-surface border-[1.5px] border-border rounded-xl px-3.5 text-sm text-brown placeholder-faint w-full"
