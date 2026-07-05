import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function TrophyIcon({ accent = 'rgba(0,0,0,0.32)', ...props }: IconProps) {
  return (
    <IconBase accent={accent} {...props}>
      <path d="M6.5 3.5h11v4.2a5.5 5.5 0 0 1-11 0V3.5z" />
      <path d="M6.5 5H4.2C4.2 8.4 5.7 10 7.6 10.3M17.5 5h2.3c0 3.4-1.5 5-3.4 5.3" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <rect x="10.7" y="11.5" width="2.6" height="4" />
      <path d="M8 18.6h8l-1-3.1H9l-1 3.1z" />
      <rect x="6.5" y="18.4" width="11" height="2.4" rx="1.1" />
      <path d="M10 6.2l1.4 1.4L15 4.7" fill="none" stroke={accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  )
}
