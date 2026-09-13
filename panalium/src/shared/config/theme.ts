/**
 * Colores de marca para usos donde Tailwind no llega (estilos inline, SVG).
 * Mantener sincronizado con las variables de `src/index.css`.
 */
export const COLORS = {
  carbon: "#1C1C1A",
  cream: "#F7F3E8",
  honey: "#F2B705",
  honeyLight: "#F8D66D",
  olive: "#68705A",
  brown: "#29251F",
  beige: "#DDD5C3",
  faint: "#A8A090",
} as const

export type ColorToken = keyof typeof COLORS

export interface AvatarPalette {
  bg: string
  fg: string
}

/** Colores rotativos para avatares hexagonales de las Abejas. */
export const AVATAR_PALETTE: AvatarPalette[] = [
  { bg: COLORS.honey, fg: COLORS.brown },
  { bg: COLORS.honeyLight, fg: COLORS.brown },
  { bg: COLORS.olive, fg: COLORS.cream },
  { bg: COLORS.beige, fg: COLORS.brown },
  { bg: COLORS.brown, fg: COLORS.honeyLight },
]

/** Color de avatar estable para un id dado. */
export function avatarColor(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i++)
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]
}
