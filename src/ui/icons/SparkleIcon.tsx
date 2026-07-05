import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function SparkleIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M11 2.2l1.9 6.4 6.4 1.9-6.4 1.9L11 18.8l-1.9-6.4L2.7 10.5l6.4-1.9L11 2.2z" />
      <path d="M18.4 14.2l.9 2.9 2.9.9-2.9.9-.9 2.9-.9-2.9-2.9-.9 2.9-.9.9-2.9z" />
    </IconBase>
  )
}
