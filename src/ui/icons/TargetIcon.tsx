import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function TargetIcon({ accent = 'rgba(0,0,0,0.32)', ...props }: IconProps) {
  return (
    <IconBase accent={accent} {...props}>
      <circle cx="12" cy="12" r="9.6" />
      <circle cx="12" cy="12" r="7" fill={accent} />
      <circle cx="12" cy="12" r="4.5" fill="currentColor" />
      <circle cx="12" cy="12" r="2" fill={accent} />
    </IconBase>
  )
}
