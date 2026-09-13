import { useMemo } from "react"
import { groupVolume, openGroups } from "@/domain"
import { useAppState } from "@/store"
import { formatPrice } from "@/shared/lib/format"

export interface AdminStat {
  label: string
  value: string
  unit?: string
  sub: string
}

export function useAdminStats(): AdminStat[] {
  const { users, products, groups } = useAppState()
  return useMemo(
    () => [
      {
        label: "Abejas",
        value: String(users.length),
        sub: "registradas en la colmena",
      },
      {
        label: "Panales recolectando",
        value: String(openGroups(groups).length),
        sub: `de ${groups.length} en total`,
      },
      {
        label: "Productos",
        value: String(products.length),
        sub: "en el catálogo",
      },
      {
        label: "USDT comprometido",
        value: formatPrice(groupVolume(groups), "USDT", 0),
        unit: "USDT",
        sub: "en todos los Panales",
      },
    ],
    [users, products, groups],
  )
}
