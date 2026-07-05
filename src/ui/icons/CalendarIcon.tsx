import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function CalendarIcon({ accent = 'rgba(0,0,0,0.32)', ...props }: IconProps) {
  return (
    <IconBase accent={accent} {...props}>
      <rect x="3.4" y="4.8" width="17.2" height="16" rx="2.6" />
      <path d="M3.6 9.4h16.8" fill="none" stroke={accent} strokeWidth="1.5" />
      <path d="M7.6 2.6v3.6M16.4 2.6v3.6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <g fill={accent}>
        <circle cx="8" cy="13" r="1.05" />
        <circle cx="12" cy="13" r="1.05" />
        <circle cx="16" cy="13" r="1.05" />
        <circle cx="8" cy="16.8" r="1.05" />
        <circle cx="12" cy="16.8" r="1.05" />
      </g>
    </IconBase>
  )
}
