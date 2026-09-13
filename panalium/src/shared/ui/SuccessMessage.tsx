import type { ReactNode } from "react"
import { Icon } from "@/shared/icons/Icon"

export default function SuccessMessage({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex items-center gap-2 text-olive text-sm font-semibold"
      role="status"
    >
      <Icon.check /> {children}
    </div>
  )
}
