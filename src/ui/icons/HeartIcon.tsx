import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function HeartIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 20.6l-1.6-1.45C5.1 14.34 1.8 11.36 1.8 7.7 1.8 4.9 4 2.8 6.75 2.8c1.55 0 3.05.72 4.05 1.88L12 5.9l1.2-1.22c1-1.16 2.5-1.88 4.05-1.88C20 2.8 22.2 4.9 22.2 7.7c0 3.66-3.3 6.64-8.6 11.46L12 20.6z" />
    </IconBase>
  )
}
