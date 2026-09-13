import { cn } from "@/shared/lib/cn"

export interface FilterOption<T extends string> {
  value: T
  label: string
}

export interface FilterChipsProps<T extends string> {
  options: FilterOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

/** Chips de filtro de selección única. Pensados para fondo carbón. */
export default function FilterChips<T extends string>({
  options,
  value,
  onChange,
  className,
}: FilterChipsProps<T>) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)} role="radiogroup">
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "h-9 px-4 rounded-full text-[13px] font-bold transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "border-[1.5px] border-border-dark text-secondary-foreground hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
