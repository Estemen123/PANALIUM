/** Parses an integer from user input, falling back when empty or invalid. */
export function toInt(value: string, fallback = 0): number {
  const parsed = parseInt(value, 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

/** Parses a float from user input, falling back when empty or invalid. */
export function toFloat(value: string, fallback = 0): number {
  const parsed = parseFloat(value)
  return Number.isNaN(parsed) ? fallback : parsed
}

/** Clamps a percentage into the 0..100 range. */
export function percentage(value: number, max: number): number {
  if (max <= 0) return 0
  return Math.min(100, Math.max(0, (value / max) * 100))
}
