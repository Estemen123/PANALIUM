import { useMemo } from "react"
import {
  groupsForProducts,
  groupsForUser,
  groupVolume,
  openGroups,
  productsByWholesaler,
  tokensForOwner,
  totalInvested,
  totalUnits,
  type User,
} from "@/domain"
import { useAppState } from "@/store"
import { formatPrice } from "@/shared/lib/format"

export interface DashboardStat {
  label: string
  value: string
  unit?: string
  sub: string
}

/** Cifras de cabecera de Mi Colmena según el rol. */
export function useDashboardStats(user: User): DashboardStat[] {
  const { users, products, groups, tokens } = useAppState()

  return useMemo(() => {
    switch (user.role) {
      case "admin":
        return [
          { label: "Abejas", value: String(users.length), sub: "registradas" },
          {
            label: "Panales recolectando",
            value: String(openGroups(groups).length),
            sub: "abiertos ahora",
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
        ]
      case "wholesaler": {
        const mine = productsByWholesaler(products, user.id)
        const interested = groupsForProducts(
          groups,
          new Set(mine.map((p) => p.id)),
        )
        return [
          {
            label: "Mis productos",
            value: String(mine.length),
            sub: "publicados",
          },
          {
            label: "Panales interesados",
            value: String(interested.length),
            sub: "en mis productos",
          },
          {
            label: "Tokens BS",
            value: formatPrice(user.wallet.bs, "BS"),
            unit: "BS",
            sub: "de recompensa",
          },
        ]
      }
      default: {
        const mine = groupsForUser(groups, user.id)
        const open = mine.filter((g) => g.status === "open").length
        const myTokens = tokensForOwner(tokens, user.id)
        const claimable = myTokens.filter((t) => t.status === "held").length
        return [
          {
            label: "Panales activos",
            value: String(mine.length),
            sub: `${open} recolectando · ${mine.length - open} en camino`,
          },
          {
            label: "Celdas comprometidas",
            value: String(totalUnits(mine, user.id)),
            sub: `${formatPrice(totalInvested(mine, user.id), "USDT")} USDT aportados`,
          },
          {
            label: "Hexakeys",
            value: String(myTokens.length),
            sub:
              claimable > 0
                ? `${claimable} lista(s) para reclamar`
                : "ninguna pendiente",
          },
        ]
      }
    }
  }, [user, users, products, groups, tokens])
}
