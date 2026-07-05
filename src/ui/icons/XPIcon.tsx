import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function XPIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 2.6l7.3 7.3-2.1 2.1L12 6.8l-5.2 5.2-2.1-2.1L12 2.6z" />
      <path d="M12 10.4l7.3 7.3-2.1 2.1L12 14.6l-5.2 5.2-2.1-2.1L12 10.4z" />
    </IconBase>
  )
}
