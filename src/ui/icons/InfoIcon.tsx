import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function InfoIcon({ accent = 'rgba(0,0,0,0.32)', ...props }: IconProps) {
  return (
    <IconBase accent={accent} {...props}>
      <circle cx="12" cy="12" r="9.6" />
      <g fill={accent}>
        <circle cx="12" cy="7.6" r="1.5" />
        <rect x="10.6" y="10.4" width="2.8" height="7.4" rx="1.4" />
      </g>
    </IconBase>
  )
}
