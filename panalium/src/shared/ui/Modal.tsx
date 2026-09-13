import { useEffect, type ReactNode } from "react"
import Card from "./Card"
import { Icon } from "@/shared/icons/Icon"
import { cn } from "@/shared/lib/cn"

export interface ModalProps {
  onClose: () => void
  children: ReactNode
  title?: string
  description?: string
  size?: "sm" | "lg"
  /** Sin relleno interno (contenido que empieza con imagen). */
  flush?: boolean
}

const SIZES = { sm: "max-w-md", lg: "max-w-2xl" }

/** Diálogo centrado sobre fondo carbón. Se cierra con clic fuera o Escape. */
export default function Modal({
  onClose,
  children,
  title,
  description,
  size = "sm",
  flush = false,
}: ModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 bg-carbon/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <Card
        className={cn(
          "w-full max-h-[90vh] overflow-y-auto shadow-2xl",
          SIZES[size],
          !flush && "p-6",
        )}
        onClick={(e) => e.stopPropagation()}
        interactive={false}
      >
        {title && (
          <div className="mb-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="display text-xl font-bold">{title}</h3>
              <button
                type="button"
                onClick={onClose}
                className="text-muted-foreground hover:text-brown"
                aria-label="Cerrar"
              >
                <Icon.x />
              </button>
            </div>
            {description && (
              <p className="text-[13px] text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </div>
        )}
        {children}
      </Card>
    </div>
  )
}
