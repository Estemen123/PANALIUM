import { Button, Card, Hex, Progress } from "@/shared/ui"
import { COLORS } from "@/shared/config/theme"
import {
  isGroupCreator,
  memberEntry,
  memberSwarm,
  type BuyingGroup,
} from "@/domain"
import { useNavigation } from "@/app/navigation"
import { GroupStatusBadges } from "@/features/groups"

const MAX_ROWS = 3

function rowNote(group: BuyingGroup, userId: string): string {
  if (group.status === "paid_to_supplier")
    return `Hexakey emitida${group.eta ? ` · llega el ${group.eta}` : ""}`
  const swarm = memberSwarm(group, userId)
  const entry = memberEntry(group, userId)
  const who = swarm ? swarm.name : "Sin Enjambre"
  if (isGroupCreator(group, userId) && !entry)
    return `${who} · fundaste este Panal`
  return `${who} · tu aporte ${entry?.units ?? 0} celdas`
}

/** Lista compacta de los Panales donde participa la Abeja. */
export default function ActiveGroupsList({
  groups,
  userId,
}: {
  groups: BuyingGroup[]
  userId: string
}) {
  const { navigate } = useNavigation()
  return (
    <Card className="p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="display text-xl font-bold">Tus Panales activos</h2>
        <Button variant="ghost" size="sm" onClick={() => navigate("my-groups")}>
          Ver todos
        </Button>
      </div>
      <div className="flex flex-col gap-2.5">
        {groups.slice(0, MAX_ROWS).map((g) => (
          <div
            key={g.id}
            className="flex items-center gap-3.5 p-3 bg-surface border border-border rounded-2xl"
          >
            <Hex size={52} color={COLORS.olive}>
              {g.imageUrl && (
                <img
                  src={g.imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
            </Hex>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-sm font-bold truncate">
                  {g.productName}
                </span>
                <GroupStatusBadges group={g} />
              </div>
              <Progress value={g.currentUnits} max={g.targetUnits} />
              <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
                <span>{rowNote(g, userId)}</span>
                <span className="mono">
                  {g.currentUnits} / {g.targetUnits} celdas
                </span>
              </div>
            </div>
          </div>
        ))}
        {groups.length === 0 && (
          <p className="text-[13px] text-muted-foreground py-4 text-center">
            Aún no tienes Panales. Toda colmena empieza con una Abeja: funda el
            primero o únete a uno abierto.
          </p>
        )}
      </div>
    </Card>
  )
}
