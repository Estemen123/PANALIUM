import { useCallback, useEffect, useState } from "react"
import { Button, Card, EmptyState, Page, PageHeader, useToast } from "@/shared/ui"
import { groupsActions, useAppDispatch } from "@/store"
import { loadPanalesFromBackend, usePanalConfig } from "@/features/groups"
import {
  callEscrowPanalFunction,
  loadEscrowContract,
  loadEscrowPanales,
  transferEscrowOwnership,
  type EscrowActionBody,
  type EscrowContractInfo,
  type EscrowPanalFunction,
  type EscrowPanalRow,
  type EscrowTx,
} from "../api"
import EscrowContractCard from "../components/EscrowContractCard"
import EscrowPanalCard from "../components/EscrowPanalCard"
import TransferOwnershipCard from "../components/TransferOwnershipCard"

interface BusyState {
  panalId: string
  fn: EscrowPanalFunction | "transferOwnership"
}

interface LastTx {
  label: string
  tx: EscrowTx
}

/** Consola del owner de EscrowPanales: cada botón firma una función onlyOwner con la wallet master. */
export default function AdminEscrowPage() {
  const toast = useToast()
  const dispatch = useAppDispatch()
  const config = usePanalConfig()
  const [contract, setContract] = useState<EscrowContractInfo | null>(null)
  const [explorerUrl, setExplorerUrl] = useState("")
  const [panales, setPanales] = useState<EscrowPanalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState<BusyState | null>(null)
  const [lastTx, setLastTx] = useState<LastTx | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const [info, rows] = await Promise.all([loadEscrowContract(), loadEscrowPanales()])
      setContract(info.contract)
      setExplorerUrl(info.explorerUrl)
      setPanales(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  async function execute(state: BusyState, label: string, run: () => Promise<EscrowTx>) {
    setBusy(state)
    setError("")
    try {
      const tx = await run()
      setLastTx({ label, tx })
      toast(`${label} confirmada en Fuji.`)
      // Las demás pantallas de admin leen los Panales del store.
      void loadPanalesFromBackend()
        .then((groups) => dispatch(groupsActions.setAll(groups)))
        .catch(() => {})
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }

  const callPanal = (panalId: string) => (fn: EscrowPanalFunction, body?: EscrowActionBody) =>
    void execute({ panalId, fn }, `${fn}(${panalId.slice(0, 6)}…)`, () => callEscrowPanalFunction(panalId, fn, body))

  return (
    <Page>
      <PageHeader
        title="Contrato Escrow"
        description="Funciones onlyOwner de EscrowPanales. Cada acción la firma la wallet master y el contrato valida la etapa y los plazos; tras confirmarse, Firestore se resincroniza."
        actions={
          <Button variant="secondary" className="text-foreground" onClick={() => void reload()} disabled={loading || busy !== null}>
            {loading ? "Leyendo cadena..." : "Actualizar"}
          </Button>
        }
      />

      <div className="flex flex-col gap-5">
        {error && (
          <p className="text-xs font-semibold text-brown bg-honey-light rounded-lg px-3 py-2" role="alert">
            {error}
          </p>
        )}

        {lastTx && (
          <p className="text-[13px] bg-primary/10 rounded-xl px-4 py-3">
            Última transacción: <span className="mono">{lastTx.label}</span> · bloque {lastTx.tx.blockNumber} ·{" "}
            <a className="font-bold text-olive hover:text-brown" href={lastTx.tx.explorerUrl} target="_blank" rel="noopener noreferrer">
              Ver en el explorador
            </a>
          </p>
        )}

        {contract && <EscrowContractCard contract={contract} explorerUrl={explorerUrl} />}

        <Card className="p-6 flex flex-col gap-4">
          <h2 className="display text-xl font-bold">Panales en el contrato</h2>
          {!loading && panales.length === 0 ? (
            <EmptyState title="Sin Panales" description="Todavía no hay Panales creados en este contrato." />
          ) : (
            <div className="flex flex-col gap-3">
              {panales.map((p) => (
                <EscrowPanalCard
                  key={p.id}
                  panal={p}
                  chainNow={contract?.blockTimestamp ?? Math.floor(Date.now() / 1000)}
                  defaultHours={config.collectionHours}
                  busy={busy?.panalId === p.id && busy.fn !== "transferOwnership" ? busy.fn : null}
                  locked={busy !== null}
                  onCall={callPanal(p.id)}
                />
              ))}
            </div>
          )}
        </Card>

        {contract && (
          <TransferOwnershipCard
            currentOwner={contract.owner}
            busy={busy?.fn === "transferOwnership"}
            locked={busy !== null || !contract.masterEsOwner}
            onTransfer={(newOwner, confirm) =>
              void execute({ panalId: "", fn: "transferOwnership" }, "transferOwnership", () =>
                transferEscrowOwnership(newOwner, confirm),
              )
            }
          />
        )}
      </div>
    </Page>
  )
}
