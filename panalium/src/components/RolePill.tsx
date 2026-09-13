import { ROLE_META, type UserRole } from "@/domain"
import { cn } from "@/shared/lib/cn"

/** Etiqueta de rol de una Abeja. Sobre carbón usa texto miel claro; sobre crema, marrón. */
export default function RolePill({
  role,
  verified,
  className,
}: {
  role: UserRole
  verified?: boolean
  className?: string
}) {
  const meta = ROLE_META[role]
  return (
    <span
      className={cn("text-[11px] font-bold", className)}
      style={{ color: meta.color }}
    >
      {meta.label}
      {verified && " verificada"}
    </span>
  )
}
