import { Hex } from "@/shared/ui"
import { COLORS } from "@/shared/config/theme"
import type { Product } from "@/domain"
import { formatAmount } from "@/shared/lib/format"

/** Resumen horizontal de un producto para listas. */
export default function ProductRow({ product }: { product: Product }) {
  return (
    <div className="flex items-center gap-3.5 p-3 bg-surface border border-border rounded-2xl">
      <Hex size={52} color={COLORS.olive}>
        <img
          src={product.image}
          alt=""
          className="w-full h-full object-cover"
        />
      </Hex>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate">{product.name}</p>
        <p className="text-xs text-muted-foreground">
          {product.category} · mín. {product.minUnits} celdas
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="mono text-sm font-semibold">
          {formatAmount(product.unitPrice, product.currency)}
        </p>
        {product.available && (
          <span className="text-[11px] font-bold text-olive">Disponible</span>
        )}
      </div>
    </div>
  )
}
