import { useMemo, useState } from "react"

import { Button, Modal, Page, PageHeader } from "@/shared/ui"

import { matchesProductSearch } from "@/domain"

import { useNavigation } from "@/app/navigation"

import { useProducts } from "../hooks/useProducts"

import ProductCard from "../components/ProductCard"

import ProductFilters, { ALL_CATEGORIES } from "../components/ProductFilters"

import GroupForm from "@/features/groups/components/GroupForm"

import { useGroupActions } from "@/features/groups/hooks/useGroups"

export default function MarketplaceProductsPage() {
  const { navigate } = useNavigation()

  const { products, categories } = useProducts()

  const { createGroup } = useGroupActions()

  const [search, setSearch] = useState("")

  const [category, setCategory] = useState(ALL_CATEGORIES)

  const [isCreateOpen, setCreateOpen] = useState(false)

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          (category === ALL_CATEGORIES || p.category === category) &&
          matchesProductSearch(p, search),
      ),

    [products, category, search],
  )

  return (
    <Page>
      <PageHeader
        title="Catálogo de proveedores"
        description="Productos de proveedores verificados. Elige uno y funda un Panal para comprarlo al mayor."
      />
      <ProductFilters
        search={search}
        onSearch={setSearch}
        categories={categories}
        category={category}
        onCategory={setCategory}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            action={
              <Button
                variant="secondary"
                size="sm"
                block
                onClick={() => setCreateOpen(true)}
              >
                Fundar un Panal con este producto
              </Button>
            }
          />
        ))}
      </div>

      {isCreateOpen && (
        <Modal
          title="Fundar un Panal"
          description="Completa los datos del producto para abrir un nuevo Panal."
          size="lg"
          onClose={() => setCreateOpen(false)}
        >
          <GroupForm
            type="local"
            success={false}
            onCancel={() => setCreateOpen(false)}
            onSubmit={(input) => {
              createGroup(input)

              setCreateOpen(false)
            }}
          />
        </Modal>
      )}
    </Page>
  )
}
