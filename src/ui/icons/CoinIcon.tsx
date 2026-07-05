import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function CoinIcon({ accent = 'rgba(0,0,0,0.32)', ...props }: IconProps) {
  return (
    <IconBase accent={accent} {...props}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="8" fill="none" stroke={accent} strokeWidth="1.3" />
      <g fill={accent}>
        <ellipse cx="12" cy="13.4" rx="2.7" ry="2.1" />
        <circle cx="9.3" cy="10.4" r="1.05" />
        <circle cx="12" cy="9.3" r="1.15" />
        <circle cx="14.7" cy="10.4" r="1.05" />
      </g>
    </IconBase>
  )
}
