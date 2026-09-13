import { useState, type FormEvent } from "react"

import {
  Button,
  Card,
  Input,
  SectionTitle,
  SuccessMessage,
  Textarea,
} from "@/shared/ui"

import { useFormState } from "@/shared/hooks"

import { toFloat, toInt } from "@/shared/lib/number"

import type { CreateProductInput } from "@/domain"

export interface ProductFormProps {
  onSubmit: (input: CreateProductInput) => Promise<void> | void

  onCancel: () => void

  success: boolean
}

export default function ProductForm({
  onSubmit,

  onCancel,

  success,
}: ProductFormProps) {
  const { form, bind } = useFormState({
    description: "",

    link: "",

    minQuantity: "",

    unitPrice: "",
  })

  const [photo, setPhoto] = useState<File | null>(null)

  const [error, setError] = useState("")

  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    setError("")

    if (!photo) {
      setError("Agrega una foto del producto antes de publicar.")

      return
    }

    setLoading(true)

    try {
      await onSubmit({
        photo,

        description: form.description,

        link: form.link,

        minQuantity: toInt(form.minQuantity, 1),

        unitPrice: toFloat(form.unitPrice, 1),
      })
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : String(submissionError),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Card className="p-6 flex flex-col gap-4">
        <Input
          label="Foto del producto *"
          type="file"
          accept="image/*"
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          hint="Se guarda en Firebase y se muestra en el catálogo"
          required
        />
        <Textarea
          label="Descripción *"
          placeholder="Ej. Arroz premium 1kg, aceite 5L, detergente concentrado..."
          rows={4}
          required
          {...bind("description")}
        />
        <Input
          label="Link de referencia"
          placeholder="https://..."
          required
          {...bind("link")}
        />
      </Card>

      <Card className="p-6 flex flex-col gap-4">
        <SectionTitle>Precio y cantidad</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Cantidad mínima *"
            type="number"
            min={1}
            step="1"
            placeholder="10"
            required
            {...bind("minQuantity")}
          />
          <Input
            label="Precio unitario *"
            type="number"
            min={0}
            step="0.01"
            placeholder="5.50"
            required
            {...bind("unitPrice")}
          />
        </div>
      </Card>

      {error && (
        <p
          className="text-xs font-semibold text-brown bg-honey-light rounded-lg px-3 py-2"
          role="alert"
        >
          {error}
        </p>
      )}

      {success ? (
        <SuccessMessage>
          Producto publicado. Ya está disponible en el catálogo del backend.
        </SuccessMessage>
      ) : (
        <div className="flex gap-3">
          <Button type="submit" variant="accent" size="lg" disabled={loading}>
            {loading ? "Publicando..." : "Publicar producto"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar
          </Button>
        </div>
      )}
    </form>
  )
}
