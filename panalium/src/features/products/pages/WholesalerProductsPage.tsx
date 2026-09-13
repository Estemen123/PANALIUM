import { Button, Page, PageHeader } from "@/shared/ui"
import { Icon } from "@/shared/icons/Icon"
import { useNavigation } from "@/app/navigation"
import { useMyProducts } from "../hooks/useProducts"
import ProductCard from "../components/ProductCard"

export default function WholesalerProductsPage() {
  const { navigate } = useNavigation()
  const myProducts = useMyProducts()

  return (
    <Page width="lg">
      <PageHeader
        title="Mis productos"
        description={`${myProducts.length} productos publicados`}
        actions={
          <Button onClick={() => navigate("wholesaler-add-product")}>
            <Icon.plus /> Publicar producto
          </Button>
        }
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {myProducts.map((p) => (
          <ProductCard key={p.id} product={p} showWholesaler={false} />
        ))}
      </div>
    </Page>
  )
}
