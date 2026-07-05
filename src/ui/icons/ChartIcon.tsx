import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function ChartIcon({ accent = 'rgba(0,0,0,0.32)', ...props }: IconProps) {
  return (
    <IconBase accent={accent} {...props}>
      <rect x="3.6" y="12.6" width="4.2" height="7.4" rx="1.3" />
      <rect x="9.9" y="7.4" width="4.2" height="12.6" rx="1.3" />
      <rect x="16.2" y="3.8" width="4.2" height="16.2" rx="1.3" />
    </IconBase>
  )
}
