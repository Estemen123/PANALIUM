import type { UserRole } from "./types"
import { COLORS } from "@/shared/config/theme"

export interface RoleMeta {
  label: string
  shortLabel: string
  color: string
}

export const ROLE_META: Record<UserRole, RoleMeta> = {
  buyer: { label: "Abeja", shortLabel: "Abeja", color: COLORS.honey },
  wholesaler: {
    label: "Abeja proveedora",
    shortLabel: "Proveedor",
    color: COLORS.olive,
  },
  admin: {
    label: "Guardián de la colmena",
    shortLabel: "Admin",
    color: COLORS.honeyLight,
  },
}

export function firstName(fullName: string): string {
  return fullName.split(" ")[0]
}
