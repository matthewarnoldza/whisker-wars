import { forwardRef, type ReactNode, type HTMLAttributes } from 'react'
import { cx } from './cx'

/** Elevation of the panel surface. */
export type PanelElevation = 'flat' | 'raised'

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  /** Surface elevation (shadow + fill weight). @default 'raised' */
  elevation?: PanelElevation
  /** Optional header content rendered above a hairline divider. */
  header?: ReactNode
  /** Trailing header slot (actions, counts) aligned right. */
  headerAction?: ReactNode
  /** Add a gold accent hairline + faint glow (featured panels). */
  accent?: boolean
}

const ELEVATION: Record<PanelElevation, string> = {
  flat: 'bg-surface/80 shadow-panel',
  raised: 'bg-surface-raised/90 shadow-panel-raised',
}

/**
 * The standard raised game surface — codified radius/shadow with the subtle
 * inner top-light. Optional header slot with a hairline divider.
 */
export const Panel = forwardRef<HTMLDivElement, PanelProps>(function Panel(
  { elevation = 'raised', header, headerAction, accent = false, className, children, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cx(
        'rounded-panel border backdrop-blur-sm',
        ELEVATION[elevation],
        accent ? 'border-accent-400/40 shadow-glow-gold-sm' : 'border-surface-border',
        className,
      )}
      {...props}
    >
      {(header || headerAction) && (
        <div className="flex items-center justify-between gap-3 border-b border-surface-border px-4 py-3">
          <div className="font-heading text-sm font-bold uppercase tracking-wide text-ink">{header}</div>
          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </div>
      )}
      <div className={cx((header || headerAction) ? 'p-4' : 'p-4')}>{children}</div>
    </div>
  )
})
