import type { ReactNode } from "react"

import { StoreProvider } from "@/store"

import { ToastProvider } from "@/shared/ui"

import { NavigationProvider } from "@/app/navigation"

import { AuthProvider } from "@/features/auth"

import { SmartAccountProvider } from "@/features/wallet"

/** Global providers, outermost first. Auth depends on Store and Navigation; the smart account depends on Auth. */

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <ToastProvider>
        <NavigationProvider>
          <AuthProvider>
            <SmartAccountProvider>{children}</SmartAccountProvider>
          </AuthProvider>
        </NavigationProvider>
      </ToastProvider>
    </StoreProvider>
  )
}
