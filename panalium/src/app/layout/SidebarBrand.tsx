import { Hex } from "@/shared/ui"
import { Icon } from "@/shared/icons/Icon"
import { BRAND } from "@/shared/config/brand"
import { COLORS } from "@/shared/config/theme"

export default function SidebarBrand() {
  return (
    <div className="flex items-center gap-3 px-2">
      <Hex size={40} color={COLORS.honey} className="text-brown">
        <Icon.hive size={20} />
      </Hex>
      <div>
        <div className="display text-xl font-extrabold leading-none">
          {BRAND.name}
        </div>
        <div className="text-[11px] text-secondary-foreground mt-1">
          {BRAND.tagline}
        </div>
      </div>
    </div>
  )
}
