import { AvatarStack, Button, Card, HexProgress } from "@/shared/ui"
import { COLORS } from "@/shared/config/theme"
import { formatPrice } from "@/shared/lib/format"
import {
  GROUP_STATUS_LABELS,
  memberEntry,
  memberSwarm,
  remainingUnits,
  swarmStats,
  type BuyingGroup,
} from "@/domain"
import { useNavigation } from "@/app/navigation"

/** Panel oscuro con el estado de la Abeja dentro de su Enjambre más reciente. */
export default function MySwarmCard({
  group,
  userId,
}: {
  group: BuyingGroup | undefined
  userId: string
}) {
  const { navigate } = useNavigation()
  const swarm = group ? memberSwarm(group, userId) : undefined
  const entry = group ? memberEntry(group, userId) : undefined

  if (!group || !swarm || !entry) {
    return (
      <Card tone="dark" className="p-6 flex flex-col gap-4">
        <div>
          <p className="label text-honey-light">Tu Enjambre</p>
          <h2 className="display text-xl font-bold mt-1">
            Todavía no vuelas en ningún Enjambre
          </h2>
        </div>
        <p className="text-[13px] text-secondary-foreground leading-relaxed">
          Únete a un Panal abierto y elige el Enjambre con el punto de retiro
          que te quede mejor.
        </p>
        <Button
          className="mt-auto"
          onClick={() => navigate("marketplace-groups")}
        >
          Explorar Panales
        </Button>
      </Card>
    )
  }

  const stats = swarmStats(group, swarm)
  const position = stats.members.findIndex((m) => m.userId === userId) + 1
  const missing = remainingUnits(group)

  return (
    <Card tone="dark" className="p-6 flex flex-col gap-4">
      <div>
        <p className="label text-honey-light">Tu Enjambre</p>
        <h2 className="display text-xl font-bold mt-1">{swarm.name}</h2>
        <p className="text-[13px] text-secondary-foreground">
          Panal: {group.productName}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <AvatarStack
          items={stats.members.map((m) => ({ id: m.userId, name: m.userName }))}
          size={34}
        />
        <span className="text-[13px] text-secondary-foreground">
          {stats.members.length} Abejas · eres la {position}ª en unirte
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-3 border border-olive rounded-xl">
          <p className="label text-secondary-foreground">Tu aporte</p>
          <p className="mono text-lg font-semibold mt-1">
            {entry.units}{" "}
            <span className="text-xs text-secondary-foreground">celdas</span>
          </p>
          <p className="text-xs text-secondary-foreground">
            {formatPrice(entry.paid, entry.currency)} {entry.currency}
          </p>
        </div>
        <div className="p-3 border border-olive rounded-xl">
          <p className="label text-secondary-foreground">Estado</p>
          <p className="text-sm font-bold text-honey-light mt-1.5">
            {GROUP_STATUS_LABELS[group.status]}
          </p>
          {group.deadline && (
            <p className="text-xs text-secondary-foreground">
              Cierra el {group.deadline}
            </p>
          )}
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs text-secondary-foreground mb-2">
          <span>Celdas del Enjambre</span>
          <span className="mono">
            {stats.units} / {swarm.capacity}
          </span>
        </div>
        <HexProgress
          filled={stats.units}
          total={swarm.capacity}
          emptyColor={COLORS.olive}
        />
      </div>

      <p className="text-[13px] text-secondary-foreground leading-relaxed mt-auto">
        {missing > 0
          ? `Faltan ${missing} celdas para llenar el Panal. Invita a otra Abeja y el Enjambre se completa antes.`
          : "El Panal está lleno. Cuando el proveedor reciba el néctar, tu Hexakey aparecerá en Mis Recibos NFT."}
      </p>
      <Button
        variant="secondary"
        block
        onClick={() => navigate("marketplace-groups")}
      >
        Ver el Panal completo
      </Button>
    </Card>
  )
}
