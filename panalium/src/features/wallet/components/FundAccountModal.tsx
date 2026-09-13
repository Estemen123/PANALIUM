import { useState } from "react"
import { Button, Input, Modal, SuccessMessage } from "@/shared/ui"
import { Icon } from "@/shared/icons/Icon"
import { shortAddress } from "@/shared/lib/format"
import { useExternalWallet } from "../hooks/useExternalWallet"
import type { ChainConfig } from "../api"

export interface FundAccountModalProps {
  /** Smart account de la Abeja: el destino de los fondos. */
  address: string
  chain: ChainConfig
  onClose: () => void
  onFunded?: () => void
}

/**
 * Fondea la smart account desde una wallet externa (MetaMask).
 *
 * Los fondos salen de la wallet del usuario y llegan a su propia cuenta abstracta, así que no
 * hay un tercero de por medio. Si el backend tiene un ERC-20 configurado se envía ese token;
 * si no, se envía AVAX, que es lo único que existe por defecto en Fuji.
 */
export default function FundAccountModal({
  address,
  chain,
  onClose,
  onFunded,
}: FundAccountModalProps) {
  const wallet = useExternalWallet()
  const [amount, setAmount] = useState("")
  const [txHash, setTxHash] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const symbol = chain.token?.symbol ?? chain.nativeCurrency.symbol
  const onRightNetwork =
    wallet.chainId?.toLowerCase() === chain.idHex.toLowerCase()

  async function handleSend() {
    setFormError(null)
    if (!amount.trim()) {
      setFormError("Escribe cuánto quieres enviar.")
      return
    }

    setSending(true)
    try {
      if (!onRightNetwork) {
        const switched = await wallet.ensureNetwork(chain)
        if (!switched) return
      }

      const hash = chain.token
        ? await wallet.sendToken(
            chain.token.address,
            address,
            amount,
            chain.token.decimals,
          )
        : await wallet.sendNative(address, amount)

      setTxHash(hash)
      onFunded?.()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal
      title={`Fondear con ${symbol}`}
      description={`Envía ${symbol} desde tu wallet a tu cuenta de Panalium.`}
      onClose={onClose}
    >
      {txHash ? (
        <div className="flex flex-col gap-4">
          <SuccessMessage>
            Enviaste {amount} {symbol}. El saldo aparece cuando la red confirme
            la transacción.
          </SuccessMessage>
          {chain.explorer && (
            <a
              href={`${chain.explorer}/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="mono text-xs text-muted-foreground hover:text-foreground truncate"
            >
              Ver en el explorador: {shortAddress(txHash, 10, 8)}
            </a>
          )}
          <Button block onClick={onClose}>
            Listo
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <p className="label mb-1.5">Destino: tu cuenta de Panalium</p>
            <code className="mono text-xs break-all text-muted-foreground">
              {address}
            </code>
          </div>

          {!wallet.available && (
            <p className="text-xs font-semibold text-brown bg-honey-light rounded-lg px-3 py-2">
              No encontramos una wallet en este navegador.{" "}
              <a
                href="https://metamask.io/download/"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                Instala MetaMask
              </a>{" "}
              y vuelve a intentarlo.
            </p>
          )}

          {wallet.available && !wallet.account && (
            <Button
              block
              onClick={() => void wallet.connect()}
              disabled={wallet.connecting}
            >
              <Icon.wallet />{" "}
              {wallet.connecting ? "Conectando..." : "Conectar MetaMask"}
            </Button>
          )}

          {wallet.account && (
            <>
              <p className="text-xs text-muted-foreground">
                Origen:{" "}
                <span className="mono">{shortAddress(wallet.account)}</span>
                {!onRightNetwork && ` · te pediremos cambiar a ${chain.name}`}
              </p>
              <Input
                label={`Monto en ${symbol}`}
                hint={
                  chain.token
                    ? "Sale de tu wallet y entra en tu cuenta de Panalium."
                    : `En esta red todavía no hay un token configurado, así que se envía ${symbol}.`
                }
                type="text"
                inputMode="decimal"
                placeholder="25.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <Button
                block
                onClick={() => void handleSend()}
                disabled={sending}
              >
                {sending ? "Confirma en tu wallet..." : `Enviar ${symbol}`}
              </Button>
            </>
          )}

          {(formError || wallet.error) && (
            <p
              className="text-xs font-semibold text-brown bg-honey-light rounded-lg px-3 py-2"
              role="alert"
            >
              {formError || wallet.error}
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}
