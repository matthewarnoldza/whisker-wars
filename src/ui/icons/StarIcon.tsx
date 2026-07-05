import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function StarIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 2.4l2.9 5.98 6.6.96-4.78 4.66 1.13 6.56L12 17.42 6.15 20.52l1.13-6.56L2.5 9.3l6.6-.96L12 2.4z" />
    </IconBase>
  )
}
