import {
  createContext,
  useContext,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react"
import type { AppAction, AppState } from "./types"
import { appReducer } from "./reducer"
import { createInitialState } from "./initialState"

const StateContext = createContext<AppState | null>(null)
const DispatchContext = createContext<Dispatch<AppAction> | null>(null)

export default function StoreProvider({
  children,
  initialState,
}: {
  children: ReactNode
  initialState?: AppState
}) {
  const [state, dispatch] = useReducer(
    appReducer,
    initialState,
    (seed) => seed ?? createInitialState(),
  )
  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        {children}
      </DispatchContext.Provider>
    </StateContext.Provider>
  )
}

export function useAppState(): AppState {
  const ctx = useContext(StateContext)
  if (!ctx) throw new Error("useAppState must be used inside <StoreProvider>")
  return ctx
}

export function useAppDispatch(): Dispatch<AppAction> {
  const ctx = useContext(DispatchContext)
  if (!ctx)
    throw new Error("useAppDispatch must be used inside <StoreProvider>")
  return ctx
}
