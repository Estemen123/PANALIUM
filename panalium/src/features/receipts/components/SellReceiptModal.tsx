import { useState } from "react"
import { Button, Input, Modal } from "@/shared/ui"
import { Icon } from "@/shared/icons/Icon"
import { useFormState } from "@/shared/hooks"
import { toFloat, toInt } from "@/shared/lib/number"
import { formatPrice } from "@/shared/lib/format"
import type { ERC1155Token, SellReceiptInput } from "@/domain"

export interface SellReceiptModalProps {
  token: ERC1155Token
  onClose: () => void
  /** Devuelve si la publicación salió bien, para liberar el botón si falló. */
  onSubmit: (input: SellReceiptInput) => Promise<boolean>
}

/** Formulario para publicar celdas de una Hexakey en el Mercado de Abejas al precio que elija la Abeja. */
export default function SellReceiptModal({
  token,
  onClose,
  onSubmit,
}: SellReceiptModalProps) {
  const { form, bind } = useFormState({
    amount: String(token.amount),
    price: token.unitPrice ? String(token.unitPrice) : "",
  })
  const [busy, setBusy] = useState(false)
  const amount = toInt(form.amount, 0)
  const price = toFloat(form.price.replace(",", "."), 0)
  const valid = amount >= 1 && amount <= token.amount && price > 0

  async function submit() {
    setBusy(true)
    const done = await onSubmit({ amount, askPrice: price, askCurrency: "USDC" })
    if (!done) setBusy(false)
  }

  return (
    <Modal
      onClose={busy ? () => {} : onClose}
      title="Vender Hexakey"
      description="Publica celdas de tu Hexakey en el Mercado de Abejas. El precio lo fijas tú y otras Abejas pueden comprarla o hacerte ofertas."
    >
      <div className="bg-surface border border-border rounded-xl p-3 mb-4 flex items-center gap-3">
        <img
          src={token.productImage}
          alt=""
          className="hex w-12 h-[54px] object-cover"
        />
        <div>
          <p className="text-sm font-bold">{token.groupName}</p>
          <p className="text-xs text-muted-foreground">
            Tienes {token.amount} celdas disponibles
            {token.unitPrice ? ` · pagaste ${formatPrice(token.unitPrice, "USDC")} USDC por celda` : ""}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 mb-5">
        <Input
          label={`Celdas a vender (máx. ${token.amount})`}
          type="number"
          min="1"
          max={token.amount}
          {...bind("amount")}
        />
        <Input
          label="Monto por celda (USDC)"
          type="number"
          step="0.01"
          min="0"
          placeholder="9,50"
          {...bind("price")}
        />
      </div>

      {price > 0 && amount > 0 && (
        <div className="bg-surface border border-border rounded-xl p-3 mb-4 text-[13px] text-muted-foreground">
          Recibirías en total:{" "}
          <span className="mono font-semibold text-brown">
            {formatPrice(amount * price, "USDC")} USDC
          </span>
        </div>
      )}

      <Button block disabled={!valid || busy} onClick={() => void submit()}>
        <Icon.tag /> {busy ? "Publicando..." : "Publicar en el Mercado de Abejas"}
      </Button>
    </Modal>
  )
}
