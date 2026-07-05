import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function MergeIcon({ accent = 'rgba(0,0,0,0.32)', ...props }: IconProps) {
  return (
    <IconBase accent={accent} {...props}>
      <circle cx="12" cy="10.4" r="7.6" />
      <path d="M5.7 18.4h12.6l1.6 3.1H4.1l1.6-3.1z" />
      <path d="M8.8 8.2a3.6 3.6 0 0 1 3.2-2.2" fill="none" stroke={accent} strokeWidth="1.6" strokeLinecap="round" />
    </IconBase>
  )
}
