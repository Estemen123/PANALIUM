import { Button, Input, Modal } from "@/shared/ui"
import { CurrencySelect } from "@/components"
import { Icon } from "@/shared/icons/Icon"
import { useFormState } from "@/shared/hooks"
import { toFloat, toInt } from "@/shared/lib/number"
import { formatPrice } from "@/shared/lib/format"
import type { Currency, ERC1155Token, SellReceiptInput } from "@/domain"

export interface SellReceiptModalProps {
  token: ERC1155Token
  onClose: () => void
  onSubmit: (input: SellReceiptInput) => void
}

export default function SellReceiptModal({
  token,
  onClose,
  onSubmit,
}: SellReceiptModalProps) {
  const { form, bind, setField } = useFormState({
    amount: "1",
    price: "",
    currency: "USDT" as Currency,
  })
  const amount = toInt(form.amount, 0)
  const price = toFloat(form.price, 0)

  return (
    <Modal
      onClose={onClose}
      title="Vender Hexakey"
      description="Publica celdas de tu Hexakey en el Mercado de Abejas. El precio lo fijas tú."
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
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Precio por celda"
            type="number"
            step="0.01"
            placeholder="9,50"
            {...bind("price")}
          />
          <CurrencySelect
            label="Moneda"
            value={form.currency}
            onChange={(c) => setField("currency", c)}
          />
        </div>
      </div>

      {form.price && (
        <div className="bg-surface border border-border rounded-xl p-3 mb-4 text-[13px] text-muted-foreground">
          Total estimado:{" "}
          <span className="mono font-semibold text-brown">
            {formatPrice(amount * price, form.currency)} {form.currency}
          </span>
        </div>
      )}

      <Button
        block
        onClick={() =>
          onSubmit({
            amount: Math.max(1, amount),
            askPrice: price,
            askCurrency: form.currency,
          })
        }
      >
        <Icon.tag /> Publicar en el Mercado de Abejas
      </Button>
    </Modal>
  )
}
