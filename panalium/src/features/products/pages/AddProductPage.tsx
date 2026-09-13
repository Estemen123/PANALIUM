import { Page, PageHeader } from "@/shared/ui"

import { useTimedFlag } from "@/shared/hooks"

import { useNavigation } from "@/app/navigation"

import { useProductActions } from "../hooks/useProducts"

import ProductForm from "../components/ProductForm"

const REDIRECT_MS = 1500

export default function AddProductPage() {
  const { navigate } = useNavigation()

  const { addProduct } = useProductActions()

  const [success, showSuccess] = useTimedFlag(REDIRECT_MS, () =>
    navigate("wholesaler-products"),
  )

  return (
    <Page width="sm">
      <PageHeader
        title="Publicar producto"
        description="Publica un producto para que las Abejas puedan fundar Panales con él."
      />
      <ProductForm
        success={success}
        onCancel={() => navigate("wholesaler-products")}
        onSubmit={async (input) => {
          await addProduct(input)

          showSuccess()
        }}
      />
    </Page>
  )
}
