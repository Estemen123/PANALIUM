import { CONTROL_CLASS, FilterChips } from "@/shared/ui"
import { Icon } from "@/shared/icons/Icon"
import { cn } from "@/shared/lib/cn"

export interface ProductFiltersProps {
  search: string
  onSearch: (q: string) => void
  categories: string[]
  category: string
  onCategory: (c: string) => void
}

export const ALL_CATEGORIES = "all"

export default function ProductFilters({
  search,
  onSearch,
  categories,
  category,
  onCategory,
}: ProductFiltersProps) {
  const options = [
    { value: ALL_CATEGORIES, label: "Todos" },
    ...categories.map((c) => ({ value: c, label: c })),
  ]
  return (
    <div className="flex flex-wrap items-center gap-2.5 mb-6">
      <div className="relative w-[300px]">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint">
          <Icon.search />
        </span>
        <input
          type="search"
          placeholder="Buscar productos o proveedores"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          aria-label="Buscar productos"
          className={cn(
            CONTROL_CLASS,
            "h-10 pl-10 bg-transparent border-border-dark text-foreground placeholder-faint",
          )}
        />
      </div>
      <FilterChips options={options} value={category} onChange={onCategory} />
    </div>
  )
}
