import type { InputHTMLAttributes } from "react"
import FormField, { CONTROL_CLASS } from "./FormField"
import { cn } from "@/shared/lib/cn"

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
}

export default function Input({
  label,
  hint,
  className,
  ...props
}: InputProps) {
  return (
    <FormField label={label} hint={hint}>
      <input {...props} className={cn(CONTROL_CLASS, className)} />
    </FormField>
  )
}
