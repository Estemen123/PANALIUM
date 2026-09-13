/** Returns the current date as `YYYY-MM-DD`. */
export function today(): string {
  return new Date().toISOString().split("T")[0]
}
