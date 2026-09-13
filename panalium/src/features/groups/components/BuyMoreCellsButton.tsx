import { useState } from "react"
import { Button, useToast, type ButtonProps, type ButtonVariant } from "@/shared/ui"
import { Icon } from "@/shared/icons/Icon"
import {
  canIncreaseParticipation,
  memberEntry,
  remainingUnits,
  type BuyingGroup,
} from "@/domain"
import { useGroupActions } from "../hooks/useGroups"
import ReserveCellsModal from "./ReserveCellsModal"

export interface BuyMoreCellsButtonProps {
  group: BuyingGroup
  userId: string
  size?: ButtonProps["size"]
  variant?: ButtonVariant
  className?: string
}

/**
 * "Comprar más celdas" para una Abeja que ya participa. Mientras el Panal reserva paga el adelanto
 * de las celdas extra; durante el cobro paga el total al precio final.
 */
export default function BuyMoreCellsButton({
  group,
  userId,
  size = "md",
  variant = "secondary",
  className = "text-foreground",
}: BuyMoreCellsButtonProps) {
  const toast = useToast()
  const { increaseParticipation } = useGroupActions()
  const [isOpen, setOpen] = useState(false)
  const entry = memberEntry(group, userId)
  const stageAllows = group.status === "open" || group.status === "collecting"

  if (!entry || !stageAllows) return null

  const available = canIncreaseParticipation(group, userId)
  const collecting = group.status === "collecting"

  return (
    <>
      <Button
        size={size}
        variant={variant}
        className={className}
        disabled={!available}
        title={available ? undefined : "El Panal ya no tiene celdas libres"}
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
      >
        <Icon.plus /> {available ? "Comprar más celdas" : "Panal lleno"}
      </Button>

      {isOpen && (
        <div onClick={(e) => e.stopPropagation()}>
          <ReserveCellsModal
            title="Comprar más celdas"
            confirmLabel="Pagar y sumar celdas"
            mode={collecting ? "full" : "advance"}
            unitPrice={
              collecting
                ? (group.finalUnitPrice ?? group.unitPrice)
                : group.unitPrice
            }
            maxUnits={remainingUnits(group)}
            baseUnits={entry.units}
            alreadyPaid={entry.paid}
            onClose={() => setOpen(false)}
            onConfirm={async (units) => {
              const result = await increaseParticipation(group, units)
              if (!result.ok) throw new Error(result.error)
              setOpen(false)
              toast(
                `Sumaste ${units} ${units === 1 ? "celda" : "celdas"}. Ahora tienes ${entry.units + units}.`,
              )
            }}
          />
        </div>
      )}
    </>
  )
}
