import { Select } from "@/shared/ui"
import { CURRENCIES, CURRENCY_LABELS, type Currency } from "@/domain"

export interface CurrencySelectProps {
  value: Currency
  onChange: (currency: Currency) => void
  label?: string
}

export default function CurrencySelect({
  value,
  onChange,
  label = "Pagar con",
}: CurrencySelectProps) {
  return (
    <Select
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value as Currency)}
    >
      {CURRENCIES.map((c) => (
        <option key={c} value={c}>
          {CURRENCY_LABELS[c]}
        </option>
      ))}
    </Select>
  )
}
