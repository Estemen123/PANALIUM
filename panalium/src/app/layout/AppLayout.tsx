import type { ReactNode } from "react"
import type { User } from "@/domain"
import Sidebar from "./Sidebar"

/** Marco autenticado: barra lateral + área de contenido con scroll. */
export default function AppLayout({
  user,
  onLogout,
  children,
}: {
  user: User
  onLogout: () => void
  children: ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar user={user} onLogout={onLogout} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
