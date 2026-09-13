import { Button, Hex, Modal } from "@/shared/ui"
import { Icon } from "@/shared/icons/Icon"
import { COLORS } from "@/shared/config/theme"
import type { ERC1155Token } from "@/domain"

export default function ClaimReceiptModal({
  token,
  onClose,
  onConfirm,
}: {
  token: ERC1155Token
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <Modal onClose={onClose}>
      <div className="flex items-center gap-3 mb-4">
        <Hex size={44} color={COLORS.honey} className="text-brown">
          <Icon.flame />
        </Hex>
        <div>
          <h3 className="display text-xl font-bold">Reclamar producto</h3>
          <p className="text-xs text-muted-foreground">
            Esta acción no se puede deshacer
          </p>
        </div>
      </div>
      <p className="text-sm leading-relaxed mb-5">
        Al reclamar, tu Hexakey{" "}
        <span className="mono font-semibold">
          #{token.tokenId.toUpperCase()}
        </span>{" "}
        con <span className="font-bold">{token.amount} celdas</span> se quema y
        el producto queda listo para retiro en tu Enjambre.
      </p>
      <div className="flex gap-3">
        <Button variant="danger" className="flex-1" onClick={onConfirm}>
          <Icon.flame /> Quemar Hexakey y reclamar
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </Modal>
  )
}
