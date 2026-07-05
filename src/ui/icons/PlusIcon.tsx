import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function PlusIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="10.4" y="3.8" width="3.2" height="16.4" rx="1.6" />
      <rect x="3.8" y="10.4" width="16.4" height="3.2" rx="1.6" />
    </IconBase>
  )
}
