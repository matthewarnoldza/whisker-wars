import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function FishingRodIcon({ accent = 'rgba(0,0,0,0.32)', ...props }: IconProps) {
  return (
    <IconBase accent={accent} {...props}>
      <path d="M4.5 20.5c5.2 0 8.4-2.6 10.6-9.4" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
      <path d="M15.1 11.1l1.4-4.3 2 .6-1.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16.3 13.2v2.4a2.4 2.4 0 1 1-2.4-2.4" fill="none" stroke={accent} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="16.3" cy="12" r="1.5" />
    </IconBase>
  )
}
