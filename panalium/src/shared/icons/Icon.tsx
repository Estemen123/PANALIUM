import type { ReactNode, SVGProps } from "react"

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number
}

interface IconDefaults {
  size: number
  strokeWidth: number
}

function makeIcon(paths: ReactNode, defaults: IconDefaults) {
  return function IconComponent({
    size = defaults.size,
    strokeWidth = defaults.strokeWidth,
    ...rest
  }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        viewBox="0 0 24 24"
        aria-hidden="true"
        {...rest}
      >
        {paths}
      </svg>
    )
  }
}

const md = { size: 18, strokeWidth: 2 }
const sm = { size: 16, strokeWidth: 2.2 }
const xs = { size: 14, strokeWidth: 2.4 }

/**
 * Iconos SVG de trazo en rejilla de 24. Uso: `<Icon.hive />` o `<Icon.plus size={20} />`.
 */
export const Icon = {
  /** Hexágono de la marca. */
  hive: makeIcon(<path d="M12 3l7 4v10l-7 4-7-4V7z" />, md),
  /** Hexágono con eje: la Hexakey. */
  key: makeIcon(
    <>
      <path d="M12 3l7 4v10l-7 4-7-4V7z" />
      <path d="M12 3v18M5 7l14 10M19 7L5 17" />
    </>,
    md,
  ),
  wallet: makeIcon(
    <>
      <rect x="2" y="7" width="20" height="15" rx="2" />
      <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
      <circle cx="16" cy="14" r="1" fill="currentColor" stroke="none" />
    </>,
    md,
  ),
  store: makeIcon(
    <>
      <path d="M3 9l1-5h16l1 5" />
      <rect x="2" y="9" width="20" height="12" rx="1" />
      <path d="M9 21V12h6v9" />
    </>,
    md,
  ),
  users: makeIcon(
    <>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </>,
    md,
  ),
  group: makeIcon(
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>,
    md,
  ),
  plus: makeIcon(<path d="M12 5v14M5 12h14" />, sm),
  minus: makeIcon(<path d="M5 12h14" />, sm),
  globe: makeIcon(
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </>,
    md,
  ),
  chart: makeIcon(<path d="M18 20V10M12 20V4M6 20v-6" />, md),
  package: makeIcon(
    <>
      <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </>,
    md,
  ),
  logout: makeIcon(
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />,
    sm,
  ),
  check: makeIcon(<polyline points="20 6 9 17 4 12" />, {
    size: 14,
    strokeWidth: 2.6,
  }),
  link: makeIcon(
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />,
    xs,
  ),
  arrow: makeIcon(<path d="M5 12h14M12 5l7 7-7 7" />, sm),
  chevronDown: makeIcon(<polyline points="6 9 12 15 18 9" />, xs),
  search: makeIcon(
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </>,
    sm,
  ),
  shield: makeIcon(
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
    md,
  ),
  copy: makeIcon(
    <>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </>,
    { size: 14, strokeWidth: 2 },
  ),
  flame: makeIcon(
    <>
      <path d="M8.5 14c0-4 4.5-10 4.5-10s4.5 6 4.5 10a4.5 4.5 0 01-9 0z" />
      <path d="M12 19c0-2 2-4 2-4s2 2 2 4" />
    </>,
    sm,
  ),
  tag: makeIcon(
    <>
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </>,
    sm,
  ),
  send: makeIcon(
    <>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </>,
    sm,
  ),
  x: makeIcon(
    <>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </>,
    { size: 18, strokeWidth: 2 },
  ),
}

export type IconName = keyof typeof Icon
