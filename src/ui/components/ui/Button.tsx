import { forwardRef, type ReactNode } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cx } from './cx'

/** Visual intent of the button. */
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
/** Size preset controlling padding + type scale. */
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref' | 'children'> {
  /** Button content. */
  children?: ReactNode
  /** Visual intent. @default 'primary' */
  variant?: ButtonVariant
  /** Size preset. @default 'md' */
  size?: ButtonSize
  /** Show a spinner and block interaction. */
  loading?: boolean
  /** Stretch to fill the container width. */
  fullWidth?: boolean
}

const BASE =
  'relative inline-flex items-center justify-center gap-2 select-none font-heading font-bold ' +
  'uppercase tracking-wide rounded-btn border transition-colors duration-150 ' +
  'focus:outline-none focus-visible:shadow-focus-gold focus-visible:ring-0 ' +
  'disabled:opacity-50 disabled:pointer-events-none'

const VARIANTS: Record<ButtonVariant, string> = {
  // Radiant gold — the hero action.
  primary:
    'bg-gradient-to-b from-accent-300 to-accent-600 text-surface-deep border-accent-300/60 ' +
    'shadow-glow-gold-sm hover:shadow-glow-gold-lg hover:from-accent-200 hover:to-accent-500',
  // Raised surface — neutral action on the dark table.
  secondary:
    'bg-surface-raised text-ink border-surface-border shadow-panel ' +
    'hover:bg-surface-overlay hover:border-accent-400/40',
  // Destructive.
  danger:
    'bg-gradient-to-b from-danger-400 to-danger-600 text-white border-danger-400/60 ' +
    'shadow-panel hover:from-danger-400 hover:to-danger-500',
  // Minimal, chrome-free.
  ghost:
    'bg-transparent text-ink-muted border-transparent ' +
    'hover:bg-surface-raised/70 hover:text-ink',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'text-xs px-3 py-1.5',
  md: 'text-sm px-4 py-2.5',
  lg: 'text-base px-6 py-3.5',
}

/**
 * The one button for the game table — gold primary, surface secondary, danger,
 * ghost. Baked-in press/hover motion, focus-visible gold ring, loading state,
 * ref-forwarding. Replaces bespoke `motion.button` blocks across views.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, fullWidth = false, disabled, className, children, ...props },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      whileHover={disabled || loading ? undefined : { scale: 1.03, y: -1 }}
      whileTap={disabled || loading ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={cx(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)}
      {...props}
    >
      {loading && (
        <span
          aria-hidden
          className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      <span className={cx('inline-flex items-center gap-2', loading && 'opacity-80')}>{children}</span>
    </motion.button>
  )
})
