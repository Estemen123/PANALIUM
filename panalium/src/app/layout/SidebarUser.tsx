import { Avatar } from "@/shared/ui"
import { RolePill } from "@/components"
import type { User } from "@/domain"

export default function SidebarUser({ user }: { user: User }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-elevated rounded-2xl">
      <Avatar name={user.name} seed={user.id} src={user.avatar} size={40} />
      <div className="min-w-0">
        <p className="text-sm font-bold truncate leading-tight">{user.name}</p>
        <RolePill role={user.role} verified={user.verified} />
      </div>
    </div>
  )
}
