import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function ClockIcon({ accent = 'rgba(0,0,0,0.32)', ...props }: IconProps) {
  return (
    <IconBase accent={accent} {...props}>
      <circle cx="12" cy="12" r="9.6" />
      <path d="M12 6.4v6l4 2.5" fill="none" stroke={accent} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  )
}
