import { useState } from "react"
import { Badge, Button, Card, Input } from "@/shared/ui"
import { formatUsdc } from "@/features/groups/lib/formatUsdc"
import type { EscrowActionBody, EscrowPanalFunction, EscrowPanalRow } from "../api"
import { ESTADOS, ESTADO_META, formatUnix, rawToUsdc } from "../lib/escrow"

export interface EscrowPanalCardProps {
  panal: EscrowPanalRow
  /** Hora de la cadena (segundos): el contrato compara los plazos contra ella, no contra el reloj local. */
  chainNow: number
  defaultHours: number
  /** Función en curso sobre este Panal, si hay una. */
  busy: EscrowPanalFunction | null
  locked: boolean
  onCall: (fn: EscrowPanalFunction, body?: EscrowActionBody) => void
}

const num = (v: string) => (v.trim() === "" ? 0 : Number(v.replace(",", ".")))

/** Un Panal con su struct on-chain y las funciones onlyOwner que admite en su estado actual. */
export default function EscrowPanalCard({
  panal,
  chainNow,
  defaultHours,
  busy,
  locked,
  onCall,
}: EscrowPanalCardProps) {
  const [precio, setPrecio] = useState("")
  const [horas, setHoras] = useState(String(defaultHours))
  const o = panal.onchain

  const label = (fn: EscrowPanalFunction, text: string) => (busy === fn ? "Firmando..." : text)
  const confirmAnd = (message: string, fn: EscrowPanalFunction, body?: EscrowActionBody) => {
    if (window.confirm(message)) onCall(fn, body)
  }

  if (!o) {
    return (
      <Card tone="surface" className="p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold truncate">{panal.description || panal.id}</p>
          <p className="mono text-[11px] text-muted-foreground">{panal.id}</p>
        </div>
        <Badge variant="outline">No existe on-chain</Badge>
      </Card>
    )
  }

  const reservadas = Number(o.unidadesReservadas)
  const minimo = Number(o.minimoUnidades)
  const pagadas = Number(o.unidadesPagadasCompletas)
  const vencido = o.finRecoleccion > 0 && o.finRecoleccion <= chainNow
  const reservadasPagadas = reservadas > 0 && pagadas >= reservadas
  // El contrato libera con el plazo vencido y el mínimo pagado, o antes si todas las celdas pagaron el total.
  const puedeLiberar = reservadasPagadas || (vencido && pagadas >= minimo)
  const precioFinal = rawToUsdc(o.precioFinalUnidad)
  const meta = ESTADO_META[o.estado] ?? { label: `${o.estado} · ${o.etapa}`, variant: "outline" as const }

  return (
    <Card tone="surface" className="p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold truncate">{panal.description || "Panal sin descripción"}</p>
          <p className="mono text-[11px] text-muted-foreground">
            {panal.id} · {panal.createdByName || "—"} · {panal.members} Abejas
          </p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          {panal.tokenId != null && (
            <Badge variant={panal.exakeysEmitidas ? "success" : "light"}>
              Hexakey #{panal.tokenId}
              {panal.exakeysEmitidas ? "" : " pendiente"}
            </Badge>
          )}
          <Badge variant={meta.variant}>{meta.label}</Badge>
        </div>
      </div>

      <dl className="mono text-[12px] grid grid-cols-4 gap-x-4 gap-y-1">
        <dt className="text-muted-foreground">Reservadas</dt>
        <dd>
          {reservadas} / {panal.targetUnits || "—"} (mín. {minimo})
        </dd>
        <dt className="text-muted-foreground">Pagadas completas</dt>
        <dd>{pagadas}</dd>
        <dt className="text-muted-foreground">Precio estimado</dt>
        <dd>{formatUsdc(rawToUsdc(o.precioEstimadoUnidad))} USDC</dd>
        <dt className="text-muted-foreground">Precio final</dt>
        <dd>{precioFinal > 0 ? `${formatUsdc(precioFinal)} USDC` : "—"}</dd>
        <dt className="text-muted-foreground">Fin de reservas</dt>
        <dd>{formatUnix(o.finReservas)}</dd>
        <dt className="text-muted-foreground">Fin de recolección</dt>
        <dd>
          {formatUnix(o.finRecoleccion)}
          {o.estado === ESTADOS.RECOLECTANDO && (vencido ? " (vencido)" : " (abierto)")}
        </dd>
        <dt className="text-muted-foreground">Fondos pagados</dt>
        <dd>{formatUsdc(rawToUsdc(o.fondosPagadosCompletos))} USDC</dd>
      </dl>

      {o.estado === ESTADOS.RESERVANDO && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            onClick={() => onCall("iniciarCotizacion")}
            disabled={locked || reservadas < minimo}
          >
            {label("iniciarCotizacion", "iniciarCotizacion()")}
          </Button>
          {reservadas < minimo && (
            <span className="text-xs text-muted-foreground">Faltan {minimo - reservadas} celdas para el mínimo.</span>
          )}
        </div>
      )}

      {o.estado === ESTADOS.COTIZANDO && (
        <div className="flex flex-wrap items-end gap-3">
          <Input
            label="precioFinalUnidad (USDC)"
            type="number"
            step="0.000001"
            min={0}
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
          />
          <Input label="Plazo de cobro (horas)" type="number" min={1} value={horas} onChange={(e) => setHoras(e.target.value)} />
          <Button
            size="sm"
            className="mb-0.5"
            onClick={() => onCall("abrirRecoleccion", { precioFinalUnidad: num(precio), horas: num(horas) })}
            disabled={locked || !(num(precio) > 0) || !(num(horas) > 0)}
          >
            {label("abrirRecoleccion", "abrirRecoleccion()")}
          </Button>
        </div>
      )}

      {o.estado === ESTADOS.RECOLECTANDO && (
        <div className="flex flex-wrap items-end gap-3">
          <Button
            size="sm"
            onClick={() => onCall("liberarFondos")}
            disabled={locked || !puedeLiberar}
          >
            {label("liberarFondos", "liberarFondos()")}
          </Button>
          <Input label="Nuevo plazo (horas)" type="number" min={1} value={horas} onChange={(e) => setHoras(e.target.value)} />
          <Button
            size="sm"
            variant="secondary"
            className="text-foreground mb-0.5"
            onClick={() => onCall("extenderPlazo", { horas: num(horas) })}
            disabled={locked || !vencido || !(num(horas) > 0)}
          >
            {label("extenderPlazo", "extenderPlazo()")}
          </Button>
          <p className="basis-full text-xs text-muted-foreground">
            {!vencido
              ? reservadasPagadas
                ? "Todas las celdas pagaron el total: puedes liberar los fondos sin esperar el plazo."
                : `Faltan ${reservadas - pagadas} celdas por pagar: se podrá liberar antes solo si todas pagan, o al vencer el plazo con el mínimo.`
              : pagadas < minimo
                ? `Solo ${pagadas} de ${minimo} celdas mínimas pagaron el total: extiende el plazo o cancela.`
                : "Plazo vencido con el mínimo pagado: ya se pueden liberar los fondos a la tesorería."}
          </p>
        </div>
      )}

      {o.estado === ESTADOS.LIBERADO && (
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" onClick={() => onCall("sellarPanal")} disabled={locked}>
            {label("sellarPanal", "sellarPanal()")}
          </Button>
          <span className="text-xs text-muted-foreground">
            Al sellar, el scheduler del servidor emite las Hexakeys en HashKey.
          </span>
        </div>
      )}

      {o.estado <= ESTADOS.RECOLECTANDO && (
        <div className="border-t border-border pt-3">
          <Button
            size="sm"
            variant="danger"
            onClick={() =>
              confirmAnd(
                "¿Ejecutar cancelarPanal? Es irreversible: cada Abeja podrá reembolsar lo que pagó.",
                "cancelarPanal",
              )
            }
            disabled={locked}
          >
            {label("cancelarPanal", "cancelarPanal()")}
          </Button>
        </div>
      )}
    </Card>
  )
}
