import { Button, Input, Modal } from "@/shared/ui"
import { CurrencySelect } from "@/components"
import { useFormState } from "@/shared/hooks"
import type { Currency } from "@/domain"

export default function SendFundsModal({ onClose }: { onClose: () => void }) {
  const { form, bind, setField } = useFormState({
    to: "",
    amount: "",
    currency: "USDC" as Currency,
  })

  return (
    <Modal
      onClose={onClose}
      title="Enviar USDC"
      description="Transfiere USDC o tokens BS a otra Abeja de la colmena."
    >
      <div className="flex flex-col gap-4">
        <Input
          label="Dirección de la Abeja destino"
          placeholder="0x..."
          {...bind("to")}
        />
        <CurrencySelect
          label="Moneda"
          value={form.currency}
          onChange={(c) => setField("currency", c)}
        />
        <Input
          label="Monto"
          type="number"
          placeholder="0,00"
          {...bind("amount")}
        />
        <Button block onClick={onClose}>
          Confirmar envío
        </Button>
      </div>
    </Modal>
  )
}
