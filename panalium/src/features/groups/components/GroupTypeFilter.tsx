import { FilterChips } from "@/shared/ui"
import {
  GROUP_TYPE_LABELS,
  type GroupTypeFilter as GroupTypeFilterValue,
} from "@/domain"

const OPTIONS = ([
  "all",
  "local",
  "international",
] as GroupTypeFilterValue[]).map((value) => ({
  value,
  label: GROUP_TYPE_LABELS[value],
}))

export default function GroupTypeFilter({
  value,
  onChange,
}: {
  value: GroupTypeFilterValue
  onChange: (v: GroupTypeFilterValue) => void
}) {
  return <FilterChips options={OPTIONS} value={value} onChange={onChange} />
}
