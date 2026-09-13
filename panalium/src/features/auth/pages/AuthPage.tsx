import { useState } from "react"

import { Card, Hex } from "@/shared/ui"

import { Icon } from "@/shared/icons/Icon"

import { BRAND } from "@/shared/config/brand"

import { COLORS } from "@/shared/config/theme"

import AuthTabs, { type AuthMode } from "../components/AuthTabs"

import LoginForm from "../components/LoginForm"

import RegisterForm from "../components/RegisterForm"

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login")

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 flex flex-col items-center gap-3">
          <Hex size={56} color={COLORS.honey} className="text-brown">
            <Icon.hive size={26} />
          </Hex>
          <div className="display text-4xl font-extrabold tracking-tight">
            {BRAND.name}
          </div>
          <p className="text-sm text-secondary-foreground">
            {BRAND.description}
          </p>
        </div>

        <Card className="p-6">
          <AuthTabs mode={mode} onChange={setMode} />
          {mode === "login" ? (
            <LoginForm key="login" />
          ) : (
            <RegisterForm key="register" />
          )}
        </Card>

        <p className="text-center text-xs text-faint mt-4">
          Tu perfil, productos y sesión se guardan en Firebase.
        </p>
      </div>
    </div>
  )
}
