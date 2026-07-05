import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function LockIcon({ accent = 'rgba(0,0,0,0.32)', ...props }: IconProps) {
  return (
    <IconBase accent={accent} {...props}>
      <rect x="4.4" y="9.8" width="15.2" height="11.4" rx="2.6" />
      <path d="M7.4 9.8V6.9a4.6 4.6 0 0 1 9.2 0v2.9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="12" cy="14.6" r="1.8" fill={accent} />
      <rect x="11.2" y="14.6" width="1.6" height="3.6" rx="0.8" fill={accent} />
    </IconBase>
  )
}
