import type { RegisterUserInput, User } from "./types"
import { generateId, generateWalletAddress } from "@/shared/lib/id"
import { today } from "@/shared/lib/date"

export function createUser(input: RegisterUserInput): User {
  return {
    id: generateId("u"),
    name: input.name,
    email: input.email,
    phone: input.phone,
    role: input.role,
    wallet: { usdc: 0, bs: 0, address: generateWalletAddress() },
    createdAt: today(),
    verified: false,
  }
}
