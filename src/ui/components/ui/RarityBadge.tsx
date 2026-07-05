import { rarityStyle, type Rarity } from '../../constants/rarity'
import { cx } from './cx'

export interface RarityBadgeProps {
  /** Rarity to render (loosely typed for legacy call sites). */
  rarity: Rarity | string
  /** Icon edge length in px. @default 14 */
  size?: number
  /**
   * Show the rarity name alongside the shape. When false the shape alone
   * carries meaning — pass `colorblindMode` to force the label for a11y.
   * @default true
   */
  showLabel?: boolean
  /** Force the text label regardless of `showLabel` (colorblind support). */
  colorblindMode?: boolean
  className?: string
}

/**
 * Inline-SVG rarity marker. Each rarity has a distinct SHAPE (not just a color)
 * so it stays legible for colorblind players; the color is the rarity hex.
 */
function RarityGlyph({ rarity, size }: { rarity: Rarity | string; size: number }) {
  const { hex, label } = rarityStyle(rarity)
  const common = { fill: hex, stroke: 'rgba(0,0,0,0.35)', strokeWidth: 0.75 as const }
  let shape
  switch (label) {
    case 'Uncommon': // triangle
      shape = <polygon points="12,3 21,20 3,20" {...common} />
      break
    case 'Rare': // diamond
      shape = <polygon points="12,2 22,12 12,22 2,12" {...common} />
      break
    case 'Epic': // 5-point star
      shape = <polygon points="12,2 15,9 22,9.3 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9.3 9,9" {...common} />
      break
    case 'Legendary': // 4-point sparkle
      shape = <path d="M12 1 L14.5 9.5 L23 12 L14.5 14.5 L12 23 L9.5 14.5 L1 12 L9.5 9.5 Z" {...common} />
      break
    case 'Mythical': // 6-point burst
      shape = (
        <path
          d="M12 1 L14 8 L21 5 L16 11 L23 12 L16 13 L21 19 L14 16 L12 23 L10 16 L3 19 L8 13 L1 12 L8 11 L3 5 L10 8 Z"
          {...common}
        />
      )
      break
    default: // Common — circle
      shape = <circle cx="12" cy="12" r="9" {...common} />
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={`${label} rarity`} className="shrink-0">
      {shape}
    </svg>
  )
}

/**
 * Rarity marker: colorblind-safe shape + optional text label.
 */
export function RarityBadge({
  rarity,
  size = 14,
  showLabel = true,
  colorblindMode = false,
  className,
}: RarityBadgeProps) {
  const { text, label } = rarityStyle(rarity)
  const labelVisible = showLabel || colorblindMode
  return (
    <span className={cx('inline-flex items-center gap-1.5', className)}>
      <RarityGlyph rarity={rarity} size={size} />
      {labelVisible && (
        <span className={cx('font-heading text-xs font-bold uppercase tracking-wide', text)}>{label}</span>
      )}
    </span>
  )
}
