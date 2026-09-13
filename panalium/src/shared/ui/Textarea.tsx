import type { TextareaHTMLAttributes } from "react"
import FormField, { CONTROL_CLASS } from "./FormField"
import { cn } from "@/shared/lib/cn"

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  hint?: string
}

export default function Textarea({
  label,
  hint,
  className,
  ...props
}: TextareaProps) {
  return (
    <FormField label={label} hint={hint}>
      <textarea
        {...props}
        className={cn(CONTROL_CLASS, "h-auto py-2.5 resize-none", className)}
      />
    </FormField>
  )
}
