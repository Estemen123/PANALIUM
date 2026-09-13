import type { SelectHTMLAttributes } from "react"
import FormField, { CONTROL_CLASS } from "./FormField"
import { cn } from "@/shared/lib/cn"

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  hint?: string
}

export default function Select({
  label,
  hint,
  className,
  children,
  ...props
}: SelectProps) {
  return (
    <FormField label={label} hint={hint}>
      <select {...props} className={cn(CONTROL_CLASS, className)}>
        {children}
      </select>
    </FormField>
  )
}
