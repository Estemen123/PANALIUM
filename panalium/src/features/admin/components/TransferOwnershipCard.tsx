import { useState } from "react"
import { Button, Card, Input } from "@/shared/ui"

export interface TransferOwnershipCardProps {
  currentOwner: string | null
  busy: boolean
  locked: boolean
  onTransfer: (newOwner: string, confirm: string) => void
}

const isAddress = (v: string) => /^0x[a-fA-F0-9]{40}$/.test(v.trim())

/** transferOwnership: la master pierde el control del ciclo de vida de los Panales. */
export default function TransferOwnershipCard({ currentOwner, busy, locked, onTransfer }: TransferOwnershipCardProps) {
  const [newOwner, setNewOwner] = useState("")
  const [confirm, setConfirm] = useState("")
  const matches = isAddress(newOwner) && newOwner.trim().toLowerCase() === confirm.trim().toLowerCase()
  const same = currentOwner != null && newOwner.trim().toLowerCase() === currentOwner.toLowerCase()

  return (
    <Card tone="dark" className="p-6 flex flex-col gap-4">
      <div>
        <h2 className="display text-xl font-bold text-honey-light">Zona de riesgo · transferOwnership</h2>
        <p className="text-[13px] text-secondary-foreground mt-1">
          El nuevo owner será el único que pueda iniciar cotizaciones, abrir recolecciones, liberar, sellar y
          cancelar. El servidor dejará de poder operar los Panales hasta que se le devuelva la propiedad.
          renounceOwnership no está disponible: dejaría los fondos de los Panales abiertos sin salida.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Nuevo owner" placeholder="0x…" value={newOwner} onChange={(e) => setNewOwner(e.target.value)} />
        <Input
          label="Repite la dirección para confirmar"
          placeholder="0x…"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      <div>
        <Button
          variant="primary"
          onClick={() => {
            if (window.confirm(`¿Transferir la propiedad del contrato a ${newOwner.trim()}?`)) {
              onTransfer(newOwner.trim(), confirm.trim())
            }
          }}
          disabled={locked || !matches || same}
        >
          {busy ? "Firmando..." : "transferOwnership()"}
        </Button>
      </div>
    </Card>
  )
}
