import type {
  BuyingGroup,
  CreateGroupInput,
  GroupMember,
  JoinGroupInput,
} from "./types"
import type { User } from "@/domain/user/types"
import { generateId } from "@/shared/lib/id"
import { today } from "@/shared/lib/date"
import { PLACEHOLDER_IMAGES } from "@/shared/config/placeholders"

export function createBuyingGroup(
  input: CreateGroupInput,
  creator: User,
): BuyingGroup {
  const isIntl = input.type === "international"
  const id = generateId(isIntl ? "gi" : "g")
  return {
    id,
    type: input.type,
    creatorId: creator.id,
    creatorName: creator.name,
    productName: input.productName,
    description: input.description,
    productId: input.productId,
    productLink: input.productLink,
    supplierName: input.supplierName,
    imageUrl:
      input.imageUrl ||
      (isIntl
        ? PLACEHOLDER_IMAGES.internationalGroup
        : PLACEHOLDER_IMAGES.group),
    targetUnits: input.targetUnits,
    currentUnits: 0,
    unitPrice: input.unitPrice,
    currency: input.currency,
    entryDeposit: input.entryDeposit,
    minUnits: input.targetUnits,
    // Todo Panal nace con un Enjambre; el fundador puede añadir más después.
    swarms: [
      {
        id: `${id}-e1`,
        name: "Enjambre 1",
        pickupPoint: input.pickupPoint,
        capacity: input.targetUnits,
      },
    ],
    members: [],
    status: "open",
    category: input.category,
    createdAt: today(),
    deadline: input.deadline,
  }
}

export function createGroupMember(
  group: BuyingGroup,
  user: User,
  input: JoinGroupInput,
): GroupMember {
  return {
    userId: user.id,
    userName: user.name,
    swarmId: input.swarmId,
    units: input.units,
    paid: input.units * group.unitPrice,
    currency: input.currency,
    joinedAt: today(),
  }
}

/** Devuelve el Panal con la nueva Abeja y las celdas actualizadas (inmutable). */
export function withNewMember(
  group: BuyingGroup,
  member: GroupMember,
): BuyingGroup {
  const currentUnits = group.currentUnits + member.units
  return {
    ...group,
    members: [...group.members, member],
    currentUnits,
    status:
      group.status === "open" && currentUnits >= group.targetUnits
        ? "funded"
        : group.status,
  }
}
