import type { ReactNode } from "react"

/** Título de sección dentro de una tarjeta de formulario. */
export default function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="display text-lg font-bold">{children}</h2>
}
