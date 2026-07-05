import { type ReactNode } from 'react'
import { cx } from './cx'

/** Accent tone for the value/icon. */
export type StatPillTone = 'gold' | 'health' | 'attack' | 'arcane' | 'neutral'
export type StatPillSize = 'sm' | 'md'

export interface StatPillProps {
  /** Leading icon slot (emoji, SVG, image). */
  icon?: ReactNode
  /** Short label (e.g. HP, ATK). Optional for icon-only pills. */
  label?: ReactNode
  /** The value (e.g. 24, 1,250). */
  value: ReactNode
  /** Color tone. @default 'neutral' */
  tone?: StatPillTone
  /** @default 'md' */
  size?: StatPillSize
  className?: string
}

const TONES: Record<StatPillTone, string> = {
  gold: 'text-accent-300 border-accent-400/40',
  health: 'text-success-400 border-success-500/40',
  attack: 'text-danger-400 border-danger-500/40',
  arcane: 'text-arcane-300 border-arcane-400/40',
  neutral: 'text-ink border-surface-border',
}

const SIZES: Record<StatPillSize, string> = {
  sm: 'text-xs px-2 py-1 gap-1',
  md: 'text-sm px-2.5 py-1.5 gap-1.5',
}

/**
 * The HP / ATK / coins pattern: icon-slot + optional label + value in a raised
 * pill. Shared across battle and collection.
 */
export function StatPill({ icon, label, value, tone = 'neutral', size = 'md', className }: StatPillProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-pill border bg-surface-raised/80 shadow-panel font-heading font-bold tabular-nums',
        SIZES[size],
        TONES[tone],
        className,
      )}
    >
      {icon && <span className="shrink-0 leading-none">{icon}</span>}
      {label && <span className="text-ink-subtle font-semibold uppercase tracking-wide">{label}</span>}
      <span>{value}</span>
    </span>
  )
}
