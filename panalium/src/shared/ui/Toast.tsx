import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { cn } from "@/shared/lib/cn"

type ToastVariant = "success" | "error"

interface ToastState {
  message: string
  variant: ToastVariant
}

type ShowToast = (message: string, variant?: ToastVariant) => void

const ToastContext = createContext<ShowToast | null>(null)
const DURATION_MS = 2600

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback<ShowToast>((message, variant = "success") => {
    if (timer.current) clearTimeout(timer.current)
    setToast({ message, variant })
    timer.current = setTimeout(() => setToast(null), DURATION_MS)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div
          role="status"
          className={cn(
            "fixed top-5 right-5 z-[60] flex items-center gap-3 bg-elevated border text-sm font-semibold px-4 py-3 rounded-xl shadow-xl",
            toast.variant === "success"
              ? "border-honey text-honey-light"
              : "border-beige text-cream",
          )}
        >
          <span
            className="hex w-3 h-3.5 shrink-0"
            style={{
              background: toast.variant === "success" ? "#F2B705" : "#DDD5C3",
            }}
          />
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  )
}

/** Devuelve `show(mensaje, variante)`; muestra un aviso temporal arriba a la derecha. */
export function useToast(): ShowToast {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>")
  return ctx
}
