import { AvatarStack, Badge, Button, Progress } from "@/shared/ui"
import type { SwarmStats } from "@/domain"

export interface SwarmRowProps {
  stats: SwarmStats
  /** La Abeja actual pertenece a este Enjambre. */
  isMine: boolean
  /** Puede unirse (Panal abierto, no es miembro, hay espacio). */
  canJoin: boolean
  onJoin: () => void
}

/** Fila de un Enjambre: nombre, punto de retiro, Abejas y llenado. */
export default function SwarmRow({
  stats,
  isMine,
  canJoin,
  onJoin,
}: SwarmRowProps) {
  const { swarm, members, units, isFull, remaining } = stats
  const almostFull =
    !isFull && remaining <= Math.max(2, Math.round(swarm.capacity * 0.1))
  return (
    <div className="flex items-center gap-3.5 px-3.5 py-3 bg-surface border border-border rounded-2xl">
      <div className="w-[130px] shrink-0">
        <p className="text-sm font-bold">{swarm.name}</p>
        <p className="text-xs text-muted-foreground">
          Retiro: {swarm.pickupPoint}
        </p>
      </div>
      <div className="flex-1 flex items-center gap-3 min-w-0">
        <AvatarStack
          items={members.map((m) => ({ id: m.userId, name: m.userName }))}
          size={28}
          max={4}
        />
        <Progress value={units} max={swarm.capacity} className="flex-1" />
        <span className="mono text-xs text-muted-foreground w-[84px] text-right shrink-0">
          {units} / {swarm.capacity} celdas
        </span>
      </div>
      <div className="w-[96px] flex justify-end shrink-0">
        {isMine ? (
          <Badge variant="light">Tu Enjambre</Badge>
        ) : isFull ? (
          <Badge variant="neutral">Lleno</Badge>
        ) : canJoin ? (
          <Button size="sm" onClick={onJoin}>
            Unirme
          </Button>
        ) : almostFull ? (
          <Badge variant="neutral">Casi lleno</Badge>
        ) : null}
      </div>
    </div>
  )
}
