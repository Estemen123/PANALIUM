import { useState } from "react"
import { Button, Input, Modal, useToast } from "@/shared/ui"
import { GROUP_STATUS_LABELS, type BuyingGroup, type PanalQuote } from "@/domain"
import type { ActionResult } from "@/shared/lib/result"
import { estimateQuoteOnBackend, type QuoteInput } from "../api"
import { useAdminPanalActions, usePanalConfig } from "../hooks/useGroups"
import { formatUsdc } from "../lib/formatUsdc"

export interface PanalAdminModalProps {
  group: BuyingGroup
  onClose: () => void
}

interface LocalEstimate {
  costoTotal: number
  costoPorUnidad: number
  comisionPorUnidad: number
  precioFinalUnidad: number
  totalFinal: number
}

/** Misma fórmula que el backend, para previsualizar mientras se escribe. */
function estimateLocally(units: number, input: QuoteInput): LocalEstimate | null {
  if (units <= 0 || !(input.precioProveedorUnidad > 0)) return null
  const costoTotal = input.precioProveedorUnidad * units + input.envioTotal + input.otrosCostos
  const conGanancia = costoTotal * (1 + input.gananciaPorcentaje / 100)
  const precioFinalUnidad = Math.ceil((conGanancia / units) * 1e6) / 1e6
  const costoPorUnidad = costoTotal / units
  return {
    costoTotal,
    costoPorUnidad,
    comisionPorUnidad: precioFinalUnidad - costoPorUnidad,
    precioFinalUnidad,
    totalFinal: precioFinalUnidad * units,
  }
}

const num = (v: string) => (v.trim() === "" ? 0 : Number(v.replace(",", ".")))

/** Gestión de un Panal por el admin: negociación, cotización, cobro del restante y sellado. */
export default function PanalAdminModal({ group, onClose }: PanalAdminModalProps) {
  const toast = useToast()
  const config = usePanalConfig()
  const actions = useAdminPanalActions()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    precioProveedorUnidad: "",
    envioTotal: "",
    otrosCostos: "",
    gananciaPorcentaje: String(config.defaultProfitPercent),
  })
  const [serverQuote, setServerQuote] = useState<PanalQuote | null>(null)

  const input: QuoteInput = {
    precioProveedorUnidad: num(form.precioProveedorUnidad),
    envioTotal: num(form.envioTotal),
    otrosCostos: num(form.otrosCostos),
    gananciaPorcentaje: num(form.gananciaPorcentaje),
  }
  const local = estimateLocally(group.currentUnits, input)

  const expired = group.collectionEndsAt ? Date.parse(group.collectionEndsAt) <= Date.now() : false
  const minPaid = (group.paidUnits ?? 0) >= group.minUnits

  async function run(label: string, action: () => Promise<ActionResult>, success: string, close = false) {
    setError("")
    setBusy(label)
    const result = await action()
    setBusy(null)
    if (!result.ok) {
      setError(result.error)
      return
    }
    toast(success)
    if (close) onClose()
  }

  async function estimate() {
    setError("")
    setBusy("estimate")
    try {
      setServerQuote(await estimateQuoteOnBackend(group.id, input))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setServerQuote(null)
  }

  return (
    <Modal
      title={`Gestionar: ${group.productName}`}
      description={`Etapa: ${GROUP_STATUS_LABELS[group.status]} · ${group.currentUnits}/${group.targetUnits} celdas reservadas · mínimo ${group.minUnits}`}
      size="lg"
      onClose={busy ? () => {} : onClose}
    >
      <div className="flex flex-col gap-4">
        {(group.status === "open" || group.status === "funded") && (
          <div className="flex flex-col gap-3">
            <p className="text-sm">
              Cuando el Panal llega a su objetivo la negociación empieza sola. Con el mínimo alcanzado
              ({group.minUnits} celdas) puedes iniciarla antes.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => run("negotiate", () => actions.startNegotiation(group), "Negociación iniciada.")}
                disabled={busy !== null || group.currentUnits < group.minUnits}
              >
                {busy === "negotiate" ? "Firmando..." : "Iniciar negociación"}
              </Button>
            </div>
          </div>
        )}

        {group.status === "negotiating" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm">
              Registra lo acordado con el vendedor. El precio final por celda incluye producto, envío,
              otros costos y la comisión de la colmena. Al abrir el cobro las Abejas tienen{" "}
              {config.collectionHours} h para pagar el restante.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Precio del proveedor por unidad (USDC) *" type="number" step="0.000001" min={0} value={form.precioProveedorUnidad} onChange={set("precioProveedorUnidad")} />
              <Input label="Envío total (USDC)" type="number" step="0.000001" min={0} value={form.envioTotal} onChange={set("envioTotal")} />
              <Input label="Otros costos: aduana, etc. (USDC)" type="number" step="0.000001" min={0} value={form.otrosCostos} onChange={set("otrosCostos")} />
              <Input label="Comisión de la colmena (%)" type="number" step="0.01" min={0} value={form.gananciaPorcentaje} onChange={set("gananciaPorcentaje")} />
            </div>

            {local && (
              <dl className="mono text-[13px] grid grid-cols-2 gap-x-4 gap-y-1 bg-primary/10 rounded-xl px-4 py-3">
                <dt className="text-muted-foreground">Costo total ({group.currentUnits} celdas)</dt>
                <dd className="text-right">{formatUsdc(local.costoTotal)} USDC</dd>
                <dt className="text-muted-foreground">Costo por celda</dt>
                <dd className="text-right">{formatUsdc(local.costoPorUnidad)} USDC</dd>
                <dt className="text-muted-foreground">Comisión por celda</dt>
                <dd className="text-right">{formatUsdc(local.comisionPorUnidad)} USDC</dd>
                <dt className="font-bold">Precio final estimado por celda</dt>
                <dd className="text-right font-bold">{formatUsdc(local.precioFinalUnidad)} USDC</dd>
                <dt className="text-muted-foreground">Total del pedido</dt>
                <dd className="text-right">{formatUsdc(local.totalFinal)} USDC</dd>
              </dl>
            )}

            {serverQuote && (
              <div className="flex flex-col gap-2">
                {!serverQuote.valida && (
                  <p className="text-xs font-semibold text-brown bg-honey-light rounded-lg px-3 py-2" role="alert">
                    El precio final no cubre los adelantos ya pagados: el mínimo es{" "}
                    {formatUsdc(serverQuote.precioMinimoPermitido)} USDC por celda.
                  </p>
                )}
                <table className="mono text-[12px] w-full">
                  <thead>
                    <tr className="text-muted-foreground text-left">
                      <th className="font-normal">Abeja</th>
                      <th className="font-normal text-right">Celdas</th>
                      <th className="font-normal text-right">Pagado</th>
                      <th className="font-normal text-right">Total</th>
                      <th className="font-normal text-right">Restante</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serverQuote.abejas?.map((a) => (
                      <tr key={a.uid}>
                        <td className="truncate max-w-[140px]">{a.name || a.uid.slice(0, 6)}</td>
                        <td className="text-right">{a.unidades}</td>
                        <td className="text-right">{formatUsdc(a.pagado)}</td>
                        <td className="text-right">{formatUsdc(a.total)}</td>
                        <td className="text-right font-bold">{formatUsdc(a.restante)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" className="text-foreground" onClick={estimate} disabled={busy !== null || !local}>
                {busy === "estimate" ? "Calculando..." : "Calcular por Abeja"}
              </Button>
              <Button
                onClick={() =>
                  run("collect", () => actions.openCollection(group, input), `Cobro abierto por ${config.collectionHours} h.`, true)
                }
                disabled={busy !== null || !local || serverQuote?.valida === false}
              >
                {busy === "collect" ? "Firmando..." : `Abrir cobro del restante (${config.collectionHours} h)`}
              </Button>
            </div>
          </div>
        )}

        {group.status === "collecting" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm">
              Precio final {formatUsdc(group.finalUnitPrice ?? 0)} USDC por celda · pagaron el total{" "}
              <span className="font-bold">
                {group.paidUnits ?? 0} de {group.minUnits}
              </span>{" "}
              celdas mínimas · cierre {group.collectionEndsAt ? new Date(group.collectionEndsAt).toLocaleString("es-VE") : "—"}
            </p>
            {!expired ? (
              <p className="text-[13px] text-muted-foreground">
                El contrato no permite sellar antes del cierre. Al vencer, el servidor sella el Panal y emite las
                Hexakeys solo si se pagó el mínimo.
              </p>
            ) : (
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => run("seal", () => actions.seal(group), "Panal sellado y Hexakeys emitidas.", true)}
                  disabled={busy !== null || !minPaid}
                >
                  {busy === "seal" ? "Sellando..." : "Sellar y emitir Hexakeys"}
                </Button>
                <Button
                  variant="secondary"
                  className="text-foreground"
                  onClick={() => run("extend", () => actions.extendCollection(group, config.collectionHours), "Plazo extendido.")}
                  disabled={busy !== null}
                >
                  {busy === "extend" ? "Firmando..." : `Extender ${config.collectionHours} h`}
                </Button>
              </div>
            )}
          </div>
        )}

        {(group.status === "paid_to_supplier" || (group.status === "closed" && !group.tokenId)) && (
          <Button onClick={() => run("seal", () => actions.seal(group), "Panal sellado y Hexakeys emitidas.", true)} disabled={busy !== null}>
            {busy === "seal" ? "Sellando..." : "Completar sellado y Hexakeys"}
          </Button>
        )}

        {group.status === "closed" && group.tokenId && (
          <p className="text-sm">
            Sellado. {group.paidUnits ?? 0} Hexakeys emitidas con el token #{group.tokenId} en HashKey Chain, en
            custodia de la wallet master.{" "}
            {group.exakeysExplorerUrl && (
              <a className="font-bold text-olive hover:text-brown" href={group.exakeysExplorerUrl} target="_blank" rel="noopener noreferrer">
                Ver transacción
              </a>
            )}
          </p>
        )}

        {error && (
          <p className="text-xs font-semibold text-brown bg-honey-light rounded-lg px-3 py-2" role="alert">
            {error}
          </p>
        )}

        {["open", "funded", "negotiating", "collecting"].includes(group.status) && (
          <div className="border-t border-border pt-3">
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (window.confirm("¿Disolver este Panal? Cada Abeja podrá recuperar lo que pagó.")) {
                  void run("cancel", () => actions.cancel(group), "Panal disuelto.", true)
                }
              }}
              disabled={busy !== null}
            >
              {busy === "cancel" ? "Firmando..." : "Disolver Panal"}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}
