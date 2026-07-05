import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function PawIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <ellipse cx="12" cy="15.8" rx="4.3" ry="3.4" />
      <ellipse cx="6.6" cy="10.6" rx="1.8" ry="2.2" />
      <ellipse cx="10.2" cy="8.1" rx="1.9" ry="2.4" />
      <ellipse cx="13.8" cy="8.1" rx="1.9" ry="2.4" />
      <ellipse cx="17.4" cy="10.6" rx="1.8" ry="2.2" />
    </IconBase>
  )
}
