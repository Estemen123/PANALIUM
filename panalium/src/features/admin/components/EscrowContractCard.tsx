import type { ReactNode } from "react"
import { Badge, Card } from "@/shared/ui"
import { formatUsdc } from "@/features/groups/lib/formatUsdc"
import type { EscrowContractInfo } from "../api"
import { formatUnix, shortAddress } from "../lib/escrow"

export interface EscrowContractCardProps {
  contract: EscrowContractInfo
  explorerUrl: string
}

interface FieldProps {
  label: string
  children: ReactNode
}

function Field({ label, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mono text-[13px] truncate">{children}</dd>
    </div>
  )
}

/** Resumen del contrato: direcciones clave, saldos y si la wallet master sigue siendo owner. */
export default function EscrowContractCard({ contract, explorerUrl }: EscrowContractCardProps) {
  const addressLink = (address: string | null) =>
    address ? (
      <a
        className="font-bold text-olive hover:text-brown"
        href={`${explorerUrl}/address/${address}`}
        target="_blank"
        rel="noopener noreferrer"
        title={address}
      >
        {shortAddress(address)}
      </a>
    ) : (
      "—"
    )
  const usdc = (value: number | null) => (value == null ? "—" : `${formatUsdc(value)} USDC`)

  return (
    <Card className="p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="display text-xl font-bold">EscrowPanales · Avalanche Fuji</h2>
        {contract.masterEsOwner ? (
          <Badge variant="success">La wallet master es owner</Badge>
        ) : (
          <Badge variant="dark">La wallet master NO es owner</Badge>
        )}
      </div>

      {!contract.masterEsOwner && (
        <p className="text-xs font-semibold text-brown bg-honey-light rounded-lg px-3 py-2" role="alert">
          Las funciones onlyOwner van a revertir: el servidor firma con {shortAddress(contract.masterAddress)} y el
          owner actual es {shortAddress(contract.owner)}.
        </p>
      )}

      <dl className="grid grid-cols-4 gap-x-6 gap-y-4">
        <Field label="Contrato">{addressLink(contract.address)}</Field>
        <Field label="Owner">{addressLink(contract.owner)}</Field>
        <Field label="Wallet master (firma)">{addressLink(contract.masterAddress)}</Field>
        <Field label="Tesorería">{addressLink(contract.tesoreria)}</Field>
        <Field label="Token de cobro">{addressLink(contract.usdc)}</Field>
        <Field label="USDC en custodia">{usdc(contract.saldoEscrowUsdc)}</Field>
        <Field label="USDC en tesorería">{usdc(contract.saldoTesoreriaUsdc)}</Field>
        <Field label="AVAX de la master (gas)">
          {contract.avaxMaster == null ? "—" : `${contract.avaxMaster.toFixed(4)} AVAX`}
        </Field>
        <Field label="Adelanto al reservar">
          {contract.advancePercent == null ? "—" : `${contract.advancePercent}%`}
        </Field>
        <Field label="Hora de la cadena">{formatUnix(contract.blockTimestamp ?? 0)}</Field>
      </dl>
    </Card>
  )
}
