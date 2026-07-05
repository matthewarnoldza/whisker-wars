import { type ReactNode } from 'react'
import { rarityStyle, type Rarity } from '../../constants/rarity'
import { cx } from './cx'

/** Generic semantic tone for a non-rarity badge. */
export type BadgeVariant = 'neutral' | 'gold' | 'arcane' | 'success' | 'danger' | 'warning'
export type BadgeSize = 'sm' | 'md'

export interface BadgeProps {
  children?: ReactNode
  /** Generic tone. Ignored when `rarity` is set. @default 'neutral' */
  variant?: BadgeVariant
  /** When set, the badge styles itself from the canonical RARITY map. */
  rarity?: Rarity | string
  /** @default 'sm' */
  size?: BadgeSize
  className?: string
}

const VARIANTS: Record<BadgeVariant, string> = {
  neutral: 'bg-surface-overlay text-ink-muted border-surface-border',
  gold: 'bg-accent-500/15 text-accent-300 border-accent-400/40',
  arcane: 'bg-arcane-500/15 text-arcane-300 border-arcane-400/40',
  success: 'bg-success-500/15 text-success-400 border-success-500/40',
  danger: 'bg-danger-500/15 text-danger-400 border-danger-500/40',
  warning: 'bg-warning-500/15 text-warning-400 border-warning-500/40',
}

const SIZES: Record<BadgeSize, string> = {
  sm: 'text-[10px] px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
}

/**
 * Compact pill label. Rarity-aware via the RARITY map (`rarity` prop) or generic
 * semantic tones (`variant`).
 */
export function Badge({ children, variant = 'neutral', rarity, size = 'sm', className }: BadgeProps) {
  const rarityClasses = rarity
    ? cx(rarityStyle(rarity).text, rarityStyle(rarity).border, 'bg-surface-raised/70')
    : VARIANTS[variant]
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-pill border font-heading font-bold uppercase tracking-wide',
        SIZES[size],
        rarityClasses,
        className,
      )}
    >
      {rarity && !children ? rarityStyle(rarity).label : children}
    </span>
  )
}
