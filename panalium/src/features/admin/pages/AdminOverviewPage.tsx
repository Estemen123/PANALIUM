import { useState } from "react"
import { Card, Page, PageHeader, StatCard } from "@/shared/ui"
import { useAppState } from "@/store"
import { ProductRow } from "@/features/products"
import { PanalAdminModal } from "@/features/groups"
import { useAdminStats } from "../hooks/useAdminStats"
import GroupSummaryRow from "../components/GroupSummaryRow"

export default function AdminOverviewPage() {
  const { groups, products } = useAppState()
  const stats = useAdminStats()
  const [managingId, setManagingId] = useState<string | null>(null)
  // Se resuelve desde el store para que el modal refleje cada cambio de etapa.
  const managing = groups.find((g) => g.id === managingId)

  return (
    <Page>
      <PageHeader
        title="Resumen de la colmena"
        description="Estado general de Abejas, Panales y catálogo."
      />

      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <StatCard
            key={s.label}
            label={s.label}
            value={s.value}
            unit={s.unit}
            sub={s.sub}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-6 flex flex-col gap-4">
          <h2 className="display text-xl font-bold">Todos los Panales</h2>
          <div className="flex flex-col gap-2.5">
            {groups.map((g) => (
              <GroupSummaryRow
                key={g.id}
                group={g}
                onManage={() => setManagingId(g.id)}
              />
            ))}
          </div>
        </Card>
        <Card className="p-6 flex flex-col gap-4">
          <h2 className="display text-xl font-bold">Catálogo</h2>
          <div className="flex flex-col gap-2.5">
            {products.map((p) => (
              <ProductRow key={p.id} product={p} />
            ))}
          </div>
        </Card>
      </div>

      {managing && (
        <PanalAdminModal
          group={managing}
          onClose={() => setManagingId(null)}
        />
      )}
    </Page>
  )
}
