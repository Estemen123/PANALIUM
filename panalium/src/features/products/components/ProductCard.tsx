import type { ReactNode } from "react"
import { Card } from "@/shared/ui"
import type { Product } from "@/domain"
import { formatPrice } from "@/shared/lib/format"

export interface ProductCardProps {
  product: Product
  action?: ReactNode
  showWholesaler?: boolean
}

export default function ProductCard({
  product,
  action,
  showWholesaler = true,
}: ProductCardProps) {
  return (
    <Card className="overflow-hidden flex flex-col" interactive>
      <img
        src={product.image}
        alt={product.name}
        className="w-full h-44 object-cover bg-beige"
      />
      <div className="p-4 flex flex-col gap-2 flex-1">
        <p className="text-xs text-muted-foreground">
          {product.category}
          {showWholesaler && ` · ${product.wholesalerName}`}
        </p>
        <h3 className="text-[15px] font-bold leading-snug">{product.name}</h3>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {product.description}
        </p>
        <div className="flex items-center justify-between mt-auto pt-2">
          <span className="mono text-lg font-semibold">
            {formatPrice(product.unitPrice, product.currency)}{" "}
            <span className="text-xs text-muted-foreground">
              {product.currency} / celda
            </span>
          </span>
          <span className="text-xs text-muted-foreground">
            mín. {product.minUnits}
          </span>
        </div>
        {action}
      </div>
    </Card>
  )
}
