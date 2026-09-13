import type { ISODate } from "@/domain/common/types"
import type { Wallet } from "@/domain/wallet/types"

export type UserRole = "buyer" | "wholesaler" | "admin"

export interface User {
  id: string
  name: string
  email: string
  phone: string
  role: UserRole
  wallet: Wallet
  createdAt: ISODate
  verified: boolean
  avatar?: string
}

export type RegistrableRole = Exclude<UserRole, "admin">

export interface RegisterUserInput {
  name: string
  email: string
  phone: string
  role: RegistrableRole
}
