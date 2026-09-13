import { createContext, useContext, type ReactNode } from "react"

import { useAuth } from "@/features/auth"

import {
  useSmartAccountData,
  type SmartAccountState,
} from "./hooks/useSmartAccount"

/**
 * Comparte una sola consulta de la smart account entre todas las pantallas.
 *
 * `GET /api/account/me` reconstruye el Kernel client y consulta la red, así que es caro:
 * sin este contexto, la barra lateral, la tarjeta de Mi Colmena y la página de billetera
 * lanzarían tres peticiones idénticas en cada render del layout.
 */

const SmartAccountContext = createContext<SmartAccountState | null>(null)

export default function SmartAccountProvider({
  children,
}: {
  children: ReactNode
}) {
  const { user } = useAuth()

  // Se recarga sola al entrar y se vacía al salir, porque la consulta depende del usuario.

  const value = useSmartAccountData(user?.id ?? null)

  return (
    <SmartAccountContext.Provider value={value}>
      {children}
    </SmartAccountContext.Provider>
  )
}

export function useSmartAccount(): SmartAccountState {
  const ctx = useContext(SmartAccountContext)

  if (!ctx)
    throw new Error(
      "useSmartAccount must be used inside <SmartAccountProvider>",
    )

  return ctx
}
