import type { User } from "@/domain"
import type { AppAction } from "../types"

export interface AddUserAction {
  type: "users/add"
  user: User
}

export type UsersAction = AddUserAction

export const usersActions = {
  add: (user: User): UsersAction => ({ type: "users/add", user }),
}

export function usersReducer(state: User[], action: AppAction): User[] {
  switch (action.type) {
    case "users/add":
      return [...state, action.user]
    default:
      return state
  }
}
