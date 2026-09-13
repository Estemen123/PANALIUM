import { useCallback, useState } from "react"

const RESET_MS = 2000

/** Copies text to the clipboard and exposes a short-lived `copied` flag. */
export function useClipboard() {
  const [copied, setCopied] = useState(false)
  const copy = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), RESET_MS)
  }, [])
  return { copied, copy }
}
