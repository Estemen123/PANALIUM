import { useId, useRef, useState, type FormEvent } from "react"
import { Button, Card, Input, SuccessMessage, Textarea } from "@/shared/ui"
import { Icon } from "@/shared/icons/Icon"
import { useFormState } from "@/shared/hooks"
import { toFloat, toInt } from "@/shared/lib/number"
import type { CreateGroupInput, Currency, GroupType } from "@/domain"
import ReserveCellsModal from "./ReserveCellsModal"

/** Mañana en `YYYY-MM-DD`: el contrato exige que el cierre de reservas sea futuro. */
function tomorrow(): string {
  return new Date(Date.now() + 86_400_000).toISOString().split("T")[0]
}

export interface GroupFormProps {
  type: GroupType
  onSubmit: (input: CreateGroupInput) => Promise<void> | void
  onCancel: () => void
  success: boolean
}

interface VariantCopy {
  namePlaceholder: string
  descPlaceholder: string
  priceLabel: string
  unitsLabel: string
  depositLabel: string
  deadlineLabel: string
  submitLabel: string
  successLabel: string
  defaultDeposit: number
  defaultUnits: number
  noteTitle: string
  note: string
}

/** Textos y valores por defecto que cambian entre Panal local y de importación. */
const VARIANT: Record<GroupType, VariantCopy> = {
  local: {
    namePlaceholder: "Ej. Aceite de oliva 1L",
    descPlaceholder: "Describe el producto, su uso y detalles relevantes...",
    priceLabel: "Precio por unidad *",
    unitsLabel: "Cantidad mínima de productos *",
    depositLabel: "Depósito de seriedad *",
    deadlineLabel: "Fecha de cierre",
    submitLabel: "Fundar el Panal",
    successLabel: "Tu Panal está abierto. Ahora a reunir Abejas.",
    defaultDeposit: 10,
    defaultUnits: 100,
    noteTitle: "Depósito de seriedad:",
    note: "asegura que cada Abeja va en serio. Si el Panal no se llena antes del cierre, los USDC vuelven a cada reserva.",
  },
  international: {
    namePlaceholder: "Ej. Auriculares TWS Bluetooth",
    descPlaceholder:
      "Describe el producto, la marca y la plataforma de origen...",
    priceLabel: "Precio por unidad *",
    unitsLabel: "Cantidad mínima de productos *",
    depositLabel: "Depósito de seriedad *",
    deadlineLabel: "Fecha de cierre",
    submitLabel: "Fundar el Panal de importación",
    successLabel:
      "Tu Panal de importación está abierto. Ahora a reunir Abejas.",
    defaultDeposit: 15,
    defaultUnits: 100,
    noteTitle: "Panal de importación:",
    note: "incluye envío y aduana en el precio por celda. El depósito protege a todas las Abejas del Panal.",
  },
}

export default function GroupForm({
  type,
  onSubmit,
  onCancel,
  success,
}: GroupFormProps) {
  const v = VARIANT[type]
  const inputRef = useRef<HTMLInputElement | null>(null)
  const fileInputId = useId()
  const [selectedImage, setSelectedImage] = useState<string>("")
  const [photo, setPhoto] = useState<File | null>(null)
  const [isReserveOpen, setReserveOpen] = useState(false)

  const { form, bind, setField } = useFormState({
    productName: "",
    description: "",
    productLink: "",
    supplierName: "",
    imageUrl: "",
    pickupPoint: "",
    targetUnits: "",
    unitPrice: "",
    currency: "USDC" as Currency,
    entryDeposit: "",
    deadline: "",
    category: "General",
  })

  function handleImageSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const previewUrl = URL.createObjectURL(file)
    setSelectedImage(previewUrl)
    setPhoto(file)
    setField("imageUrl", previewUrl)
  }

  const targetUnits = toInt(form.targetUnits, v.defaultUnits)
  const unitPrice = toFloat(form.unitPrice, 1)

  /** "Fundar" no crea nada todavía: abre el popup para reservar celdas y pagar el adelanto. */
  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setReserveOpen(true)
  }

  /** Solo cuando el fundador paga su adelanto se crea el Panal en el contrato. */
  async function handleReserve(reserveUnits: number) {
    await onSubmit({
      type,
      productName: form.productName || "Producto del Panal",
      description: form.description,
      productLink: form.productLink,
      supplierName: form.supplierName || undefined,
      imageUrl: selectedImage || form.imageUrl,
      photo,
      pickupPoint: form.pickupPoint || "Por definir",
      targetUnits,
      unitPrice,
      currency: form.currency,
      entryDeposit: toFloat(form.entryDeposit, v.defaultDeposit),
      category: "General",
      deadline: form.deadline || undefined,
      reserveUnits,
    })
    setReserveOpen(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Card className="p-6 flex flex-col gap-4">
        <div className="rounded-[24px] border-2 border-dashed border-[#d5d0c7] bg-[#f4efe8] p-4">
          {selectedImage ? (
            <div className="overflow-hidden rounded-[20px] border border-[#d5d0c7] bg-white">
              <img
                src={selectedImage}
                alt="Producto seleccionado"
                className="h-56 w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex h-56 flex-col items-center justify-center gap-5 rounded-[20px] border border-dashed border-[#d5d0c7] bg-[#f7f3ee]">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f0c13b] text-3xl font-bold text-[#1b1b1b] shadow-sm transition hover:scale-[1.02]"
                aria-label="Añadir foto del producto"
              >
                <Icon.plus size={26} />
              </button>
            </div>
          )}

          <input
            id={fileInputId}
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />
        </div>

        <Textarea
          label="Descripción *"
          placeholder={v.descPlaceholder}
          rows={3}
          required
          {...bind("description")}
        />

        <Input
          label="Link del producto (plataforma) *"
          placeholder="https://www.amazon.com/..."
          required
          {...bind("productLink")}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Cantidad mínima de productos *"
            type="number"
            placeholder="10"
            required
            {...bind("targetUnits")}
          />
          <Input
            label="Precio por unidad *"
            type="number"
            step="0.01"
            placeholder="4,50"
            required
            {...bind("unitPrice")}
          />
        </div>

        <Input
          label={`${v.deadlineLabel} *`}
          type="date"
          min={tomorrow()}
          required
          hint="Hasta este día las Abejas pueden reservar celdas en el contrato"
          {...bind("deadline")}
        />
      </Card>

      {success ? (
        <SuccessMessage>{v.successLabel}</SuccessMessage>
      ) : (
        <div className="flex gap-3">
          <Button type="submit" size="lg">
            {v.submitLabel}
          </Button>
          <Button
            variant="ghost"
            onClick={onCancel}
            className="text-secondary-foreground"
          >
            Cancelar
          </Button>
        </div>
      )}

      {isReserveOpen && (
        <ReserveCellsModal
          title="Reserva tus celdas"
          confirmLabel="Pagar y fundar"
          unitPrice={unitPrice}
          maxUnits={targetUnits}
          onClose={() => setReserveOpen(false)}
          onConfirm={handleReserve}
        />
      )}
    </form>
  )
}
