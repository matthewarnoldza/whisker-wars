import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function HealIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="9.2" y="3" width="5.6" height="18" rx="2.4" />
      <rect x="3" y="9.2" width="18" height="5.6" rx="2.4" />
    </IconBase>
  )
}
