import { useEffect, useState } from "react"
import { Button, useToast } from "@/shared/ui"
import {
  memberEntry,
  remainingToPay,
  type BuyingGroup,
  type User,
} from "@/domain"
import { useGroupActions } from "../hooks/useGroups"
import { formatUsdc } from "../lib/formatUsdc"
import BuyMoreCellsButton from "./BuyMoreCellsButton"

export interface PanalStageCardProps {
  group: BuyingGroup
  user: User
}

/** "1 d 4 h", "3 h 12 min"... hasta la fecha dada; null si ya pasó. */
function timeLeft(iso: string, now: number): string | null {
  const ms = Date.parse(iso) - now
  if (!Number.isFinite(ms) || ms <= 0) return null
  const min = Math.floor(ms / 60_000)
  const d = Math.floor(min / 1440)
  const h = Math.floor((min % 1440) / 60)
  const m = min % 60
  if (d > 0) return `${d} d ${h} h`
  if (h > 0) return `${h} h ${m} min`
  return `${m} min`
}

function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

/** Etapa actual del Panal (negociación, cobro, sellado...) y lo que la Abeja puede hacer en ella. */
export default function PanalStageCard({ group, user }: PanalStageCardProps) {
  const toast = useToast()
  const now = useNow()
  const { payRemaining, refund } = useGroupActions()
  const [busy, setBusy] = useState<"pay" | "refund" | null>(null)

  const entry = memberEntry(group, user.id)
  const remaining = remainingToPay(group, user.id)
  const left = group.collectionEndsAt ? timeLeft(group.collectionEndsAt, now) : null
  const quote = group.quote
  const collecting = group.status === "collecting"
  const canRefund =
    Boolean(entry) &&
    (group.status === "cancelled" ||
      (group.status === "closed" && !entry?.paidComplete))

  async function run(kind: "pay" | "refund", action: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    setBusy(kind)
    const result = await action()
    setBusy(null)
    if (!result.ok) toast(result.error ?? "No se pudo completar la operación", "error")
    else toast(success)
  }

  let headline: string | null = null
  let detail: string | null = null
  switch (group.status) {
    case "funded":
      headline = "Panal lleno"
      detail = "Se completaron las celdas. En breve empieza la negociación con el proveedor."
      break
    case "negotiating":
      headline = "En negociación con el proveedor"
      detail = "Estamos acordando el precio real con el vendedor. Después tendrás un plazo para pagar el restante."
      break
    case "collecting":
      headline = left ? `Cobrando el restante · cierra en ${left}` : "Plazo de cobro vencido"
      detail = left
        ? "Paga el restante (producto, envío y comisión) antes del cierre para asegurar tus celdas."
        : group.collectionExpired
          ? "No se llegó al mínimo pagado. La colmena decidirá si extiende el plazo o disuelve el Panal."
          : "El Panal se sellará en cuanto se procese el cierre."
      break
    case "paid_to_supplier":
      headline = "Fondos liberados al proveedor"
      detail = "El pago salió del contrato. Falta sellar el Panal y emitir las Hexakeys."
      break
    case "closed":
      headline = "Panal sellado"
      detail = group.tokenId
        ? `Se emitieron ${group.paidUnits ?? 0} Hexakeys (token #${group.tokenId}), una por cada unidad pagada.`
        : "Emitiendo las Hexakeys de cada unidad pagada."
      break
    case "cancelled":
      headline = "Panal disuelto"
      detail = "Cada Abeja puede recuperar lo que pagó."
      break
  }

  if (!headline) return null

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5">
      {headline && (
        <div>
          <p className="text-sm font-bold">{headline}</p>
          {detail && <p className="text-[13px] text-muted-foreground mt-0.5">{detail}</p>}
        </div>
      )}

      {quote && (collecting || group.status === "closed" || group.status === "paid_to_supplier") && (
        <dl className="mono text-[12px] grid grid-cols-2 gap-x-4 gap-y-1 bg-primary/10 rounded-xl px-3 py-2.5">
          <dt className="text-muted-foreground">Producto por celda</dt>
          <dd className="text-right">{formatUsdc(quote.precioProveedorUnidad)} USDC</dd>
          <dt className="text-muted-foreground">Envío y otros por celda</dt>
          <dd className="text-right">{formatUsdc(quote.envioPorUnidad)} USDC</dd>
          <dt className="text-muted-foreground">Comisión ({quote.gananciaPorcentaje}%)</dt>
          <dd className="text-right">{formatUsdc(quote.comisionPorUnidad)} USDC</dd>
          <dt className="font-bold">Precio final por celda</dt>
          <dd className="text-right font-bold">{formatUsdc(quote.precioFinalUnidad)} USDC</dd>
        </dl>
      )}

      {entry && collecting && (
        <p className="text-[13px]">
          Tus {entry.units} celdas: pagado {formatUsdc(entry.paid)} USDC
          {entry.paidComplete ? (
            <span className="text-olive font-bold"> · pago completo</span>
          ) : (
            <> · te falta <span className="font-bold">{formatUsdc(remaining)} USDC</span></>
          )}
        </p>
      )}

      <div className="flex flex-wrap gap-2.5">
        {entry && collecting && !entry.paidComplete && left && (
          <Button
            onClick={() => run("pay", () => payRemaining(group), "Pagaste el restante. Tus celdas quedan aseguradas.")}
            disabled={busy !== null}
          >
            {busy === "pay" ? "Pagando en Avalanche..." : `Pagar restante · ${formatUsdc(remaining)} USDC`}
          </Button>
        )}
        {entry && collecting && left && <BuyMoreCellsButton group={group} userId={user.id} />}
        {canRefund && (
          <Button
            variant="secondary"
            className="text-foreground"
            onClick={() => run("refund", () => refund(group), "Reembolso enviado a tu reserva de USDC.")}
            disabled={busy !== null}
          >
            {busy === "refund" ? "Reembolsando..." : `Recuperar ${formatUsdc(entry?.paid ?? 0)} USDC`}
          </Button>
        )}
      </div>

    </div>
  )
}
