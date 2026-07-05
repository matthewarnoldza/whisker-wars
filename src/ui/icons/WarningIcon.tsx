import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function WarningIcon({ accent = 'rgba(0,0,0,0.32)', ...props }: IconProps) {
  return (
    <IconBase accent={accent} {...props}>
      <path d="M10.3 3.3a2 2 0 0 1 3.4 0l8.1 14a2 2 0 0 1-1.7 3H3.9a2 2 0 0 1-1.7-3l8.1-14z" />
      <g fill={accent}>
        <rect x="11" y="8.4" width="2" height="6.4" rx="1" />
        <circle cx="12" cy="17.6" r="1.25" />
      </g>
    </IconBase>
  )
}
