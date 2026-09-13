import type { BuyingGroup } from "@/domain"
import type { AppAction } from "../types"

export interface AddGroupAction {
  type: "groups/add"
  group: BuyingGroup
}

export interface ReplaceGroupAction {
  type: "groups/replace"
  group: BuyingGroup
}

export type GroupsAction = AddGroupAction | ReplaceGroupAction

export const groupsActions = {
  add: (group: BuyingGroup): GroupsAction => ({ type: "groups/add", group }),
  /** Replaces the group with the same id (immutable update). */
  replace: (group: BuyingGroup): GroupsAction => ({
    type: "groups/replace",
    group,
  }),
}

export function groupsReducer(
  state: BuyingGroup[],
  action: AppAction,
): BuyingGroup[] {
  switch (action.type) {
    case "groups/add":
      return [...state, action.group]
    case "groups/replace":
      return state.map((g) => (g.id === action.group.id ? action.group : g))
    default:
      return state
  }
}
