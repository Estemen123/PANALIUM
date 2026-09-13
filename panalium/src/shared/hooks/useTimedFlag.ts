import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Boolean flag that turns itself off after `ms`, optionally running `onExpire`.
 * Useful for "success" states that should transition somewhere else.
 */
export function useTimedFlag(
  ms: number,
  onExpire?: () => void,
): [boolean, () => void] {
  const [flag, setFlag] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const expireRef = useRef(onExpire)
  expireRef.current = onExpire

  const trigger = useCallback(() => {
    setFlag(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setFlag(false)
      expireRef.current?.()
    }, ms)
  }, [ms])

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  return [flag, trigger]
}
