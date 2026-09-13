import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { DEFAULT_VIEW, type View } from "./types"

interface NavigationContextValue {
  view: View
  navigate: (view: View) => void
  reset: () => void
}

const NavigationContext = createContext<NavigationContextValue | null>(null)

/**
 * In-memory view state. This is the single place to swap for a real router
 * (e.g. react-router) without touching any feature.
 */
export default function NavigationProvider({
  children,
}: {
  children: ReactNode
}) {
  const [view, setView] = useState<View>(DEFAULT_VIEW)
  const navigate = useCallback((next: View) => setView(next), [])
  const reset = useCallback(() => setView(DEFAULT_VIEW), [])
  const value = useMemo(
    () => ({ view, navigate, reset }),
    [view, navigate, reset],
  )
  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation(): NavigationContextValue {
  const ctx = useContext(NavigationContext)
  if (!ctx)
    throw new Error("useNavigation must be used inside <NavigationProvider>")
  return ctx
}
