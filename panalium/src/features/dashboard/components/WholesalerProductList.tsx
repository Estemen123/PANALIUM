import { Button, Card } from "@/shared/ui"
import { Icon } from "@/shared/icons/Icon"
import { useNavigation } from "@/app/navigation"
import { ProductRow, useMyProducts } from "@/features/products"

export default function WholesalerProductList() {
  const { navigate } = useNavigation()
  const products = useMyProducts()
  return (
    <Card className="p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="display text-xl font-bold">Mis productos</h2>
        <Button size="sm" onClick={() => navigate("wholesaler-add-product")}>
          <Icon.plus /> Publicar
        </Button>
      </div>
      <div className="flex flex-col gap-2.5">
        {products.map((p) => (
          <ProductRow key={p.id} product={p} />
        ))}
      </div>
    </Card>
  )
}
