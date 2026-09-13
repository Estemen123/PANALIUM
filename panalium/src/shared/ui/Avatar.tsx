import Hex from "./Hex"
import { avatarColor } from "@/shared/config/theme"

export interface AvatarProps {
  name: string
  /** Semilla para el color (id de usuario). Por defecto, el nombre. */
  seed?: string
  src?: string
  size?: number
  className?: string
}

/** Avatar hexagonal de una Abeja: imagen o inicial sobre color estable. */
export default function Avatar({
  name,
  seed,
  src,
  size = 40,
  className,
}: AvatarProps) {
  const palette = avatarColor(seed ?? name)
  return (
    <Hex size={size} color={palette.bg} className={className} aria-label={name}>
      {src ? (
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span
          className="font-extrabold leading-none"
          style={{ color: palette.fg, fontSize: Math.round(size * 0.4) }}
        >
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </Hex>
  )
}
