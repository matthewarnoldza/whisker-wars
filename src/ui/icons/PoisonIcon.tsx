import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function PoisonIcon({ accent = 'rgba(0,0,0,0.32)', ...props }: IconProps) {
  return (
    <IconBase accent={accent} {...props}>
      <path d="M12 2.3C12 2.3 4.8 11 4.8 15.6a7.2 7.2 0 0 0 14.4 0C19.2 11 12 2.3 12 2.3z" />
      <g fill={accent}>
        <circle cx="10" cy="15" r="1.5" />
        <circle cx="13.7" cy="16.8" r="1.1" />
        <circle cx="12" cy="12.4" r="0.9" />
      </g>
    </IconBase>
  )
}
