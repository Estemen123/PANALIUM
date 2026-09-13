const HEX = "0123456789abcdef"

/** Generates a pseudo-unique id with an optional prefix, e.g. `g-1712345678901-42`. */
export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

/** Generates a mock EVM-style wallet address (0x + 40 hex chars). */
export function generateWalletAddress(): string {
  let address = "0x"
  for (let i = 0; i < 40; i++)
    address += HEX[Math.floor(Math.random() * HEX.length)]
  return address
}
