import { useMemo, useState } from "react"

import {
  Button,
  Card,
  CONTROL_CLASS,
  EmptyState,
  Modal,
  Page,
  PageHeader,
  useToast,
} from "@/shared/ui"

import { Icon } from "@/shared/icons/Icon"

import { cn } from "@/shared/lib/cn"

import {
  filterGroupsByType,
  type GroupTypeFilter as GroupTypeFilterValue,
} from "@/domain"

import { useNavigation } from "@/app/navigation"

import { useCurrentUser } from "@/features/auth"

import { useGroupActions, useGroups } from "../hooks/useGroups"

import GroupCard from "../components/GroupCard"

import GroupTypeFilter from "../components/GroupTypeFilter"

import GroupDetailPanel from "../components/GroupDetailPanel"

import GroupForm from "../components/GroupForm"

export default function MarketplaceGroupsPage() {
  const user = useCurrentUser()

  const { navigate } = useNavigation()

  const toast = useToast()

  const groups = useGroups()

  const { joinGroup, createGroup } = useGroupActions()

  const [filter, setFilter] = useState<GroupTypeFilterValue>("all")

  const [search, setSearch] = useState("")

  const [selectedId, setSelectedId] = useState<string | null>(
    groups[0]?.id ?? null,
  )

  const [isCreateOpen, setCreateOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()

    return filterGroupsByType(groups, filter).filter(
      (g) =>
        !q ||
        g.productName.toLowerCase().includes(q) ||
        g.supplierName?.toLowerCase().includes(q),
    )
  }, [groups, filter, search])

  // Se resuelve desde el store para que el panel refleje los cambios (p. ej. al unirse).

  const selected = groups.find((g) => g.id === selectedId) ?? filtered[0]

  const isBuyer = user.role === "buyer"

  return (
    <Page width="full">
      <PageHeader
        title="Panales"
        description={
          isBuyer
            ? "Únete a un Panal abierto o funda el tuyo. Cada Panal se divide en Enjambres para organizar el retiro."
            : "Observa qué Panales están recolectando y qué productos buscan las Abejas."
        }
        actions={
          isBuyer && (
            <Button onClick={() => setCreateOpen(true)}>Fundar un Panal</Button>
          )
        }
      />

      <div className="flex items-center gap-2.5 mb-5">
        <div className="relative w-[300px]">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint">
            <Icon.search />
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar un Panal o producto"
            aria-label="Buscar Panales"
            className={cn(
              CONTROL_CLASS,

              "h-10 pl-10 bg-transparent border-border-dark text-foreground placeholder-faint",
            )}
          />
        </div>
        <GroupTypeFilter value={filter} onChange={setFilter} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Ningún Panal coincide"
          description="Prueba otro filtro o funda un Panal nuevo para este producto."
        />
      ) : (
        <div className="grid grid-cols-[1fr_1.05fr] gap-5 items-start">
          <div className="flex flex-col gap-2.5">
            {filtered.map((g) => (
              <GroupCard
                key={g.id}
                group={g}
                selected={selected?.id === g.id}
                onClick={() => setSelectedId(g.id)}
              />
            ))}
          </div>
          {selected ? (
            <GroupDetailPanel
              key={selected.id}
              group={selected}
              user={user}
              onJoin={async (input) => {
                const result = await joinGroup(selected, input)

                if (!result.ok) {
                  toast(result.error, "error")

                  return
                }

                toast("Pagaste tu adelanto y reservaste tus celdas. ¡A recolectar!")
              }}
            />
          ) : (
            <Card className="p-10 text-center text-muted-foreground">
              Elige un Panal para ver sus Enjambres.
            </Card>
          )}
        </div>
      )}

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
            onSubmit={async (input) => {
              await createGroup(input)

              setCreateOpen(false)
            }}
          />
        </Modal>
      )}
    </Page>
  )
}
