import type {
  BuyingGroup,
  GroupMember,
  GroupStatus,
  GroupType,
  Swarm,
} from "./types"
import type { User } from "@/domain/user/types"
import { percentage } from "@/shared/lib/number"

export function isGroupMember(group: BuyingGroup, userId: string): boolean {
  return group.members.some((m) => m.userId === userId)
}

export function isGroupCreator(group: BuyingGroup, userId: string): boolean {
  return group.creatorId === userId
}

/** Panales que la Abeja fundó o donde participa. */
export function groupsForUser(
  groups: BuyingGroup[],
  userId: string,
): BuyingGroup[] {
  return groups.filter(
    (g) => isGroupCreator(g, userId) || isGroupMember(g, userId),
  )
}

export function memberEntry(
  group: BuyingGroup,
  userId: string,
): GroupMember | undefined {
  return group.members.find((m) => m.userId === userId)
}

/** USDC aportado por la Abeja en los Panales dados. */
export function totalInvested(groups: BuyingGroup[], userId: string): number {
  return groups.reduce((acc, g) => acc + (memberEntry(g, userId)?.paid ?? 0), 0)
}

/** Celdas comprometidas por la Abeja en los Panales dados. */
export function totalUnits(groups: BuyingGroup[], userId: string): number {
  return groups.reduce(
    (acc, g) => acc + (memberEntry(g, userId)?.units ?? 0),
    0,
  )
}

export function groupProgress(group: BuyingGroup): number {
  return Math.round(percentage(group.currentUnits, group.targetUnits))
}

export function remainingUnits(group: BuyingGroup): number {
  return Math.max(0, group.targetUnits - group.currentUnits)
}

export function isGroupFull(group: BuyingGroup): boolean {
  return group.currentUnits >= group.targetUnits
}

export function groupVolume(groups: BuyingGroup[]): number {
  return groups.reduce((acc, g) => acc + g.currentUnits * g.unitPrice, 0)
}

export function openGroups(groups: BuyingGroup[]): BuyingGroup[] {
  return groups.filter((g) => g.status === "open")
}

export function canJoinGroup(group: BuyingGroup, user: User): boolean {
  return (
    user.role === "buyer" &&
    (group.status === "open" || group.status === "collecting") &&
    !isGroupMember(group, user.id)
  )
}

/** Quien ya participa puede sumar celdas mientras el Panal reserva o cobra, si quedan libres. */
export function canIncreaseParticipation(group: BuyingGroup, userId: string): boolean {
  return (
    isGroupMember(group, userId) &&
    (group.status === "open" || group.status === "collecting") &&
    remainingUnits(group) > 0
  )
}

/** Lo que le falta pagar a la Abeja al precio final. */
export function remainingToPay(group: BuyingGroup, userId: string): number {
  const entry = memberEntry(group, userId)
  if (!entry || entry.paidComplete || group.finalUnitPrice == null) return 0
  return Math.max(0, group.finalUnitPrice * entry.units - entry.paid)
}

export type GroupTypeFilter = GroupType | "all"

export function filterGroupsByType(
  groups: BuyingGroup[],
  type: GroupTypeFilter,
): BuyingGroup[] {
  return type === "all" ? groups : groups.filter((g) => g.type === type)
}

export function groupsForProducts(
  groups: BuyingGroup[],
  productIds: Set<string>,
): BuyingGroup[] {
  return groups.filter(
    (g) => g.productId !== undefined && productIds.has(g.productId),
  )
}

/* ── Enjambres ─────────────────────────────────────────────────────────── */

export interface SwarmStats {
  swarm: Swarm
  members: GroupMember[]
  units: number
  remaining: number
  isFull: boolean
}

export function swarmMembers(
  group: BuyingGroup,
  swarmId: string,
): GroupMember[] {
  return group.members.filter((m) => m.swarmId === swarmId)
}

export function swarmStats(group: BuyingGroup, swarm: Swarm): SwarmStats {
  const members = swarmMembers(group, swarm.id)
  const units = members.reduce((acc, m) => acc + m.units, 0)
  const remaining = Math.max(0, swarm.capacity - units)
  return { swarm, members, units, remaining, isFull: remaining === 0 }
}

export function allSwarmStats(group: BuyingGroup): SwarmStats[] {
  return group.swarms.map((s) => swarmStats(group, s))
}

/** Enjambre al que pertenece la Abeja dentro del Panal. */
export function memberSwarm(
  group: BuyingGroup,
  userId: string,
): Swarm | undefined {
  const entry = memberEntry(group, userId)
  return entry ? group.swarms.find((s) => s.id === entry.swarmId) : undefined
}

/** Primer Enjambre con espacio, si lo hay. */
export function firstOpenSwarm(group: BuyingGroup): Swarm | undefined {
  return allSwarmStats(group).find((s) => !s.isFull)?.swarm
}

export function canJoinSwarm(
  group: BuyingGroup,
  swarmId: string,
  units: number,
): boolean {
  const swarm = group.swarms.find((s) => s.id === swarmId)
  if (!swarm) return false
  return (
    swarmStats(group, swarm).remaining >= units &&
    remainingUnits(group) >= units
  )
}

/* ── Etiquetas ─────────────────────────────────────────────────────────── */

export const GROUP_STATUS_LABELS: Record<GroupStatus, string> = {
  open: "Recolectando",
  funded: "Panal lleno",
  negotiating: "En negociación",
  collecting: "Cobrando restante",
  paid_to_supplier: "Néctar enviado",
  closed: "Sellado",
  cancelled: "Panal disuelto",
}

export const GROUP_TYPE_LABELS: Record<GroupTypeFilter, string> = {
  all: "Todos",
  local: "Locales",
  international: "Importación",
}
