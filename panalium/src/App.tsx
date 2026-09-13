import AppProviders from "@/app/providers/AppProviders"

import AppLayout from "@/app/layout/AppLayout"

import AppRouter from "@/app/router/AppRouter"

import { AuthPage, useAuth } from "@/features/auth"

/** Decides between the public auth screen and the authenticated shell. */

function AppShell() {
  const { user, logout, ready } = useAuth()

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="display text-3xl font-extrabold tracking-tight">
            Cargando la colmena
          </div>
          <p className="text-sm text-muted-foreground">
            Sincronizando tu sesión y productos desde el backend...
          </p>
        </div>
      </div>
    )
  }

  if (!user) return <AuthPage />

  return (
    <AppLayout user={user} onLogout={logout}>
      <AppRouter />
    </AppLayout>
  )
}

export default function App() {
  return (
    <AppProviders>
      <AppShell />
    </AppProviders>
  )
}
