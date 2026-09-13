import { useState, type FormEvent } from "react"

import { Button, Input, Select } from "@/shared/ui"

import { Icon } from "@/shared/icons/Icon"

import { useFormState } from "@/shared/hooks"

import type { RegistrableRole } from "@/domain"

import { useAuth } from "../AuthProvider"

interface RoleOption {
  value: RegistrableRole

  label: string
}

const ROLE_OPTIONS: RoleOption[] = [
  { value: "buyer", label: "Abeja (compro en Panales)" },

  { value: "wholesaler", label: "Proveedor (publico productos)" },
]

export default function RegisterForm() {
  const { register } = useAuth()

  const { form, bind, setField } = useFormState({
    name: "",

    email: "",

    phone: "",

    password: "",

    role: "buyer" as RegistrableRole,
  })

  const [error, setError] = useState("")

  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    setError("")

    if (!form.name || !form.email || !form.phone || !form.password) {
      setError("Completa todos los campos para entrar a la colmena.")

      return
    }

    setLoading(true)

    try {
      const result = await register({
        name: form.name,

        email: form.email,

        phone: form.phone,

        role: form.role,

        password: form.password,
      })

      if (!result.ok) setError(result.error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Nombre completo / Empresa"
        placeholder="Luisa Torres"
        {...bind("name")}
      />
      <Input
        label="Correo electrónico"
        type="email"
        placeholder="tu@correo.com"
        {...bind("email")}
      />
      <Input
        label="Número de celular"
        type="tel"
        placeholder="+58 412 555-0000"
        {...bind("phone")}
      />
      <Input
        label="Contraseña"
        type="password"
        placeholder="Mínimo 8 caracteres"
        {...bind("password")}
      />
      <Select
        label="Tipo de cuenta"
        value={form.role}
        onChange={(e) => setField("role", e.target.value as RegistrableRole)}
      >
        {ROLE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>

      <div className="bg-surface rounded-xl p-3 border border-border flex items-start gap-2.5">
        <span className="text-olive mt-0.5">
          <Icon.shield />
        </span>
        <div>
          <p className="text-xs font-bold text-brown mb-0.5">
            Una Abeja, una cuenta
          </p>
          <p className="text-xs text-muted-foreground">
            Guardamos tu perfil en Firebase y el número de celular queda
            asociado a tu cuenta.
          </p>
        </div>
      </div>

      {error && (
        <p
          className="text-xs font-semibold text-brown bg-honey-light rounded-lg px-3 py-2"
          role="alert"
        >
          {error}
        </p>
      )}
      <Button type="submit" size="lg" block disabled={loading}>
        {loading ? "Registrando..." : "Registrar una nueva Abeja"}
      </Button>
    </form>
  )
}
