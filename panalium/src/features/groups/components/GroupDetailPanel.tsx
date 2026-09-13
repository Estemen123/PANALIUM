import { useState } from "react"
import { Badge, Card, Progress } from "@/shared/ui"
import { Icon } from "@/shared/icons/Icon"
import { formatPrice } from "@/shared/lib/format"
import {
  allSwarmStats,
  canJoinGroup,
  firstOpenSwarm,
  isGroupMember,
  memberEntry,
  memberSwarm,
  remainingUnits,
  type BuyingGroup,
  type JoinGroupInput,
  type User,
} from "@/domain"
import GroupStatusBadges from "./GroupStatusBadges"
import SwarmRow from "./SwarmRow"
import JoinBar from "./JoinBar"
import { useAdvancePercent } from "../hooks/useGroups"

export interface GroupDetailPanelProps {
  group: BuyingGroup
  user: User
  onJoin: (input: JoinGroupInput) => Promise<void>
}

/** Panel derecho de Panales: detalle del Panal seleccionado y su distribución en Enjambres. */
export default function GroupDetailPanel({
  group,
  user,
  onJoin,
}: GroupDetailPanelProps) {
  const advancePercent = useAdvancePercent()
  const [chosenSwarmId, setChosenSwarmId] = useState<string | null>(null)
  const stats = allSwarmStats(group)
  const mySwarm = memberSwarm(group, user.id)
  const entry = memberEntry(group, user.id)
  const joinable = canJoinGroup(group, user)
  const chosen =
    group.swarms.find((s) => s.id === chosenSwarmId) ?? firstOpenSwarm(group)
  const chosenStats = chosen
    ? stats.find((s) => s.swarm.id === chosen.id)
    : undefined
  const maxUnits = chosenStats
    ? Math.min(chosenStats.remaining, remainingUnits(group))
    : 0
  const details = [
    `Fundado por ${group.creatorName}`,
    `Adelanto ${advancePercent}% al reservar`,
    group.deadline ? `Cierra el ${group.deadline}` : null,
  ].filter(Boolean)

  return (
    <Card className="p-6 flex flex-col gap-4 overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label">Panal seleccionado</p>
          <h2 className="display text-2xl font-bold mt-1 leading-tight">
            {group.productName}
          </h2>
          <p className="text-[13px] text-muted-foreground mt-1.5">
            {details.join(" · ")}
          </p>
        </div>
        <GroupStatusBadges group={group} />
      </div>

      {group.description && (
        <p className="text-sm leading-relaxed">{group.description}</p>
      )}
      {group.productLink && (
        <a
          href={group.productLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-olive hover:text-brown"
        >
          <Icon.link /> Ver producto en el proveedor
        </a>
      )}
      {group.explorerUrl && (
        <a
          href={group.explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-olive hover:text-brown"
        >
          <Icon.link /> Ver Panal en el contrato (Snowtrace)
        </a>
      )}

      <div>
        <div className="flex justify-between text-[13px] mb-2">
          <span className="font-bold">Llenado del Panal</span>
          <span className="mono text-muted-foreground">
            {group.currentUnits} / {group.targetUnits} celdas · faltan{" "}
            {remainingUnits(group)}
          </span>
        </div>
        <Progress
          value={group.currentUnits}
          max={group.targetUnits}
          height={10}
        />
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <h3 className="display text-base font-bold">
            Distribución en Enjambres
          </h3>
          <span className="text-xs text-muted-foreground">
            Cada Enjambre = un punto de retiro
          </span>
        </div>
        {stats.map((s) => (
          <SwarmRow
            key={s.swarm.id}
            stats={s}
            isMine={mySwarm?.id === s.swarm.id}
            canJoin={joinable && !s.isFull}
            onJoin={() => setChosenSwarmId(s.swarm.id)}
          />
        ))}
      </div>

      {isGroupMember(group, user.id) && entry && (
        <div className="mt-auto flex items-center gap-2 text-sm font-semibold text-olive bg-olive/10 rounded-xl px-4 py-3">
          <Icon.check /> Ya vuelas en este Panal. Tu aporte: {entry.units}{" "}
          celdas en {mySwarm?.name ?? "tu Enjambre"}.
          {group.status === "open" && (
            <Badge variant="light" className="ml-auto">
              Recolectando
            </Badge>
          )}
        </div>
      )}
      {joinable && chosen && maxUnits > 0 && (
        <JoinBar
          key={chosen.id}
          group={group}
          swarm={chosen}
          maxUnits={maxUnits}
          onJoin={onJoin}
        />
      )}
      {joinable && (!chosen || maxUnits === 0) && (
        <p className="mt-auto text-[13px] text-muted-foreground text-center py-2">
          Todos los Enjambres están completos. Busca otro Panal que siga
          recolectando.
        </p>
      )}
    </Card>
  )
}
