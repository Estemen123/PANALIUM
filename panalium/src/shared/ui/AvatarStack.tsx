import Avatar from "./Avatar"
import Hex from "./Hex"
import { COLORS } from "@/shared/config/theme"
import { cn } from "@/shared/lib/cn"

export interface AvatarStackItem {
  id: string
  name: string
  src?: string
}

export interface AvatarStackProps {
  items: AvatarStackItem[]
  size?: number
  max?: number
  className?: string
}

/** Enjambre de avatares hexagonales solapados, con contador de sobrantes. */
export default function AvatarStack({
  items,
  size = 28,
  max = 5,
  className,
}: AvatarStackProps) {
  const shown = items.slice(0, max)
  const rest = items.length - shown.length
  const overlap = -Math.round(size * 0.28)
  return (
    <div className={cn("flex", className)} style={{ paddingLeft: -overlap }}>
      {shown.map((it) => (
        <Avatar
          key={it.id}
          name={it.name}
          seed={it.id}
          src={it.src}
          size={size}
          className="-ml-2"
        />
      ))}
      {rest > 0 && (
        <Hex size={size} color={COLORS.beige} className="-ml-2">
          <span
            className="font-extrabold text-brown leading-none"
            style={{ fontSize: Math.round(size * 0.36) }}
          >
            +{rest}
          </span>
        </Hex>
      )}
    </div>
  )
}
