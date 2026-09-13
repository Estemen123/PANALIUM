import { Avatar, Badge, Button } from "@/shared/ui"
import { RolePill } from "@/components"
import type { User } from "@/domain"
import { formatPrice } from "@/shared/lib/format"

export default function UserRow({ user }: { user: User }) {
  return (
    <div className="flex items-center gap-4 p-4">
      <Avatar name={user.name} seed={user.id} src={user.avatar} size={40} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="font-bold text-sm">{user.name}</p>
          {user.verified && <Badge variant="success">Verificada</Badge>}
        </div>
        <p className="text-xs text-muted-foreground">
          {user.email} · {user.phone}
        </p>
      </div>
      <div className="text-right shrink-0">
        <RolePill role={user.role} />
        <p className="mono text-xs text-muted-foreground mt-1">
          {formatPrice(user.wallet.usdc, "USDC", 0)} USDC
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button variant="ghost" size="sm">
          Ver
        </Button>
        <Button variant="danger" size="sm">
          Suspender
        </Button>
      </div>
    </div>
  )
}
