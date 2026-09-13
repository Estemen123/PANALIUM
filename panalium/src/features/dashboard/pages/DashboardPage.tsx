import { useState } from "react"
import { Button, Modal, Page, StatCard } from "@/shared/ui"
import { Icon } from "@/shared/icons/Icon"
import { firstName, groupsForUser, type UserRole } from "@/domain"
import { useAppState } from "@/store"
import { useNavigation } from "@/app/navigation"
import { useCurrentUser } from "@/features/auth"
import GroupForm from "@/features/groups/components/GroupForm"
import { useGroupActions } from "@/features/groups/hooks/useGroups"
import { useDashboardStats } from "../hooks/useDashboardStats"
import BalanceCard from "../components/BalanceCard"
import ActiveGroupsList from "../components/ActiveGroupsList"
import MySwarmCard from "../components/MySwarmCard"
import WholesalerProductList from "../components/WholesalerProductList"

const SUBTITLES: Record<UserRole, string> = {
  admin: "Así está la colmena hoy.",
  wholesaler: "Publica productos y observa qué Panales se interesan en ellos.",
  buyer: "Así está tu colmena hoy.",
}

export default function DashboardPage() {
  const user = useCurrentUser()
  const { groups } = useAppState()
  const { navigate } = useNavigation()
  const { createGroup } = useGroupActions()
  const [isCreateOpen, setCreateOpen] = useState(false)
  const stats = useDashboardStats(user)
  const myGroups = groupsForUser(groups, user.id)
  const latestSwarmGroup =
    myGroups.find(
      (g) => g.status === "open" && g.members.some((m) => m.userId === user.id),
    ) ?? myGroups[0]
  const isBuyer = user.role === "buyer"

  return (
    <Page>
      <div className="flex items-end justify-between gap-6 mb-6">
        <div>
          <h1 className="display text-[36px] font-extrabold tracking-tight leading-[1.05]">
            ¡Bzz! Qué bueno verte, {firstName(user.name)}
          </h1>
          <p className="text-sm text-secondary-foreground mt-2">
            {SUBTITLES[user.role]}
          </p>
        </div>
        {isBuyer && (
          <Button onClick={() => setCreateOpen(true)}>
            <Icon.plus /> Fundar un Panal
          </Button>
        )}
      </div>

      <div
        className="grid gap-4 mb-4"
        style={{ gridTemplateColumns: `1.4fr repeat(${stats.length}, 1fr)` }}
      >
        <BalanceCard />
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

      {isBuyer && (
        <div className="grid grid-cols-[1.6fr_1fr] gap-4">
          <ActiveGroupsList groups={myGroups} userId={user.id} />
          <MySwarmCard group={latestSwarmGroup} userId={user.id} />
        </div>
      )}
      {user.role === "wholesaler" && <WholesalerProductList />}
      {user.role === "admin" && (
        <ActiveGroupsList groups={groups} userId={user.id} />
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
            onSubmit={(input: Parameters<typeof createGroup>[0]) => {
              createGroup(input)
              setCreateOpen(false)
            }}
          />
        </Modal>
      )}
    </Page>
  )
}
