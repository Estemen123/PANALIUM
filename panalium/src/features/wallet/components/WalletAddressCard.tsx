import { Card } from "@/shared/ui"
import { Icon } from "@/shared/icons/Icon"
import { useClipboard } from "@/shared/hooks"

export default function WalletAddressCard({ address }: { address: string }) {
  const { copied, copy } = useClipboard()
  return (
    <Card className="p-4 mb-4">
      <p className="label mb-1.5">Dirección de tu billetera</p>
      <div className="flex items-center gap-2">
        <code className="mono text-sm truncate flex-1">{address}</code>
        <button
          type="button"
          onClick={() => copy(address)}
          className="shrink-0 text-muted-foreground hover:text-brown transition-colors p-1"
          aria-label="Copiar dirección"
        >
          {copied ? <Icon.check /> : <Icon.copy />}
        </button>
      </div>
      {copied && (
        <p className="text-xs text-olive font-semibold mt-1">
          Dirección copiada. Compártela con quien quiera enviarte USDT.
        </p>
      )}
    </Card>
  )
}
