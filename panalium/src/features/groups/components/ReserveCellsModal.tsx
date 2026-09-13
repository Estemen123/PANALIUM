import { useState } from "react"
import { Button, Modal } from "@/shared/ui"
import { Icon } from "@/shared/icons/Icon"
import { useSmartAccount } from "@/features/wallet"
import { useAdvancePercent } from "../hooks/useGroups"

export interface ReserveCellsModalProps {
  /** Precio por celda en USDC. */
  unitPrice: number
  /** Celdas totales del Panal: tope de la reserva. */
  maxUnits: number
  title: string
  confirmLabel: string
  onClose: () => void
  /** Paga el adelanto y crea/une; si lanza, el mensaje se muestra en el popup. */
  onConfirm: (units: number) => Promise<void>
}

/** USDC con los decimales que haga falta (el adelanto puede ser menor a un centavo). */
function formatUsdc(value: number): string {
  return value.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })
}

/** Popup para elegir cuántas celdas reservar y pagar el adelanto al contrato EscrowPanales. */
export default function ReserveCellsModal({
  unitPrice,
  maxUnits,
  title,
  confirmLabel,
  onClose,
  onConfirm,
}: ReserveCellsModalProps) {
  const advancePercent = useAdvancePercent()
  const { tokenBalance, account } = useSmartAccount()
  const [units, setUnits] = useState(1)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const clamp = (n: number) => Math.min(maxUnits, Math.max(1, n))
  const total = units * unitPrice
  const advance = (total * advancePercent) / 100
  const balance = tokenBalance ? Number(tokenBalance.formatted) : null
  const insufficient = balance !== null && balance < advance

  async function handleConfirm() {
    setError("")
    setLoading(true)
    try {
      await onConfirm(units)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setLoading(false)
    }
  }

  return (
    <Modal
      title={title}
      description={`Elige cuántas celdas quieres. Pagas el ${advancePercent}% ahora y te comprometes a pagar el resto cuando el Panal se llene.`}
      onClose={loading ? () => {} : onClose}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold">Celdas a reservar</span>
          <div className="h-10 border-[1.5px] border-border rounded-xl flex items-center px-2 gap-2">
            <button
              type="button"
              onClick={() => setUnits((u) => clamp(u - 1))}
              className="text-muted-foreground hover:text-foreground p-1"
              aria-label="Menos celdas"
              disabled={loading}
            >
              <Icon.minus />
            </button>
            <input
              type="number"
              min={1}
              max={maxUnits}
              value={units}
              onChange={(e) =>
                setUnits(clamp(parseInt(e.target.value, 10) || 1))
              }
              className="mono w-14 bg-transparent text-center text-sm font-semibold border-0 focus:shadow-none"
              aria-label="Celdas"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setUnits((u) => clamp(u + 1))}
              className="text-muted-foreground hover:text-foreground p-1"
              aria-label="Más celdas"
              disabled={loading}
            >
              <Icon.plus />
            </button>
          </div>
        </div>

        <dl className="mono text-[13px] flex flex-col gap-1.5 bg-primary/10 rounded-xl px-4 py-3">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">
              {units} × {formatUsdc(unitPrice)} USDC
            </dt>
            <dd>{formatUsdc(total)} USDC</dd>
          </div>
          <div className="flex justify-between font-bold text-[15px]">
            <dt>Adelanto ({advancePercent}%) a pagar ahora</dt>
            <dd>{formatUsdc(advance)} USDC</dd>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <dt>Resto al llenarse el Panal</dt>
            <dd>{formatUsdc(total - advance)} USDC</dd>
          </div>
          {balance !== null && (
            <div className="flex justify-between text-muted-foreground border-t border-border pt-1.5 mt-1">
              <dt>Tu reserva de USDC</dt>
              <dd>{formatUsdc(balance)} USDC</dd>
            </div>
          )}
        </dl>

        <p className="text-xs text-muted-foreground">
          El adelanto sale de tu smart account
          {account ? ` (${account.address.slice(0, 6)}…${account.address.slice(-4)})` : ""}{" "}
          y queda custodiado en el contrato EscrowPanales de Avalanche.
        </p>

        {insufficient && (
          <p
            className="text-xs font-semibold text-brown bg-honey-light rounded-lg px-3 py-2"
            role="alert"
          >
            No tienes suficientes USDC. Fondea tu billetera o reserva menos
            celdas.
          </p>
        )}
        {error && (
          <p
            className="text-xs font-semibold text-brown bg-honey-light rounded-lg px-3 py-2"
            role="alert"
          >
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button
            type="button"
            size="lg"
            onClick={handleConfirm}
            disabled={loading || insufficient}
          >
            {loading
              ? "Pagando en Avalanche..."
              : `${confirmLabel} · ${formatUsdc(advance)} USDC`}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
