import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function DumbbellIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="1.8" y="9.4" width="3" height="5.2" rx="1.2" />
      <rect x="4.8" y="7.8" width="2.6" height="8.4" rx="1.1" />
      <rect x="7.2" y="10.8" width="9.6" height="2.4" rx="1.1" />
      <rect x="16.6" y="7.8" width="2.6" height="8.4" rx="1.1" />
      <rect x="19.2" y="9.4" width="3" height="5.2" rx="1.2" />
    </IconBase>
  )
}
