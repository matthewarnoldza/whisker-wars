import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function MedalIcon({ accent = 'rgba(0,0,0,0.32)', ...props }: IconProps) {
  return (
    <IconBase accent={accent} {...props}>
      <path d="M7.6 2.5h3.3l-2 6.2-3.3-.2 2-6zM16.4 2.5h-3.3l2 6.2 3.3-.2-2-6z" />
      <circle cx="12" cy="15.4" r="6.6" />
      <circle cx="12" cy="15.4" r="4.1" fill={accent} />
      <path d="M12 12.5l.85 1.72 1.9.28-1.37 1.34.32 1.9L12 16.9l-1.7.84.32-1.9-1.37-1.34 1.9-.28L12 12.5z" fill="currentColor" />
    </IconBase>
  )
}
