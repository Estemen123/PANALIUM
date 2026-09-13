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

export interface SetGroupsAction {
  type: "groups/setAll"
  groups: BuyingGroup[]
}

export type GroupsAction = AddGroupAction | ReplaceGroupAction | SetGroupsAction

export const groupsActions = {
  add: (group: BuyingGroup): GroupsAction => ({ type: "groups/add", group }),
  /** Replaces the whole list (loaded from the backend). */
  setAll: (groups: BuyingGroup[]): GroupsAction => ({
    type: "groups/setAll",
    groups,
  }),
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
      return [action.group, ...state.filter((g) => g.id !== action.group.id)]
    case "groups/setAll":
      return action.groups
    case "groups/replace":
      return state.map((g) => (g.id === action.group.id ? action.group : g))
    default:
      return state
  }
}
