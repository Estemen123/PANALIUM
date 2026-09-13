import { cn } from "@/shared/lib/cn"

/** Sello "HEXAKEY · ERC-1155" que identifica un recibo NFT. */
export default function HexakeyTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "mono text-[10px] font-semibold tracking-[0.12em] text-honey-light bg-brown px-2.5 py-1 rounded-full whitespace-nowrap",
        className,
      )}
    >
      HEXAKEY · ERC-1155
    </span>
  )
}
