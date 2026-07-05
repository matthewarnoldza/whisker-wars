import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function DiceIcon({ accent = 'rgba(0,0,0,0.32)', ...props }: IconProps) {
  return (
    <IconBase accent={accent} {...props}>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="4.2" />
      <g fill={accent}>
        <circle cx="8.2" cy="8.2" r="1.6" />
        <circle cx="15.8" cy="8.2" r="1.6" />
        <circle cx="12" cy="12" r="1.6" />
        <circle cx="8.2" cy="15.8" r="1.6" />
        <circle cx="15.8" cy="15.8" r="1.6" />
      </g>
    </IconBase>
  )
}
