import { cn } from "@/shared/lib/cn"

export type AuthMode = "login" | "register"

interface AuthTab {
  id: AuthMode
  label: string
}

const TABS: AuthTab[] = [
  { id: "login", label: "Entrar" },
  { id: "register", label: "Nueva Abeja" },
]

export default function AuthTabs({
  mode,
  onChange,
}: {
  mode: AuthMode
  onChange: (m: AuthMode) => void
}) {
  return (
    <div className="flex gap-1 bg-beige/60 rounded-xl p-1 mb-6" role="tablist">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={mode === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex-1 h-10 text-sm font-bold rounded-lg transition-all",
            mode === tab.id
              ? "bg-brown text-honey-light shadow"
              : "text-muted-foreground hover:text-brown",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
