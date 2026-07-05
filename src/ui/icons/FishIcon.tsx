import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function FishIcon({ accent = 'rgba(0,0,0,0.32)', ...props }: IconProps) {
  return (
    <IconBase accent={accent} {...props}>
      <path d="M8.8 12c0-3 3-5.6 7-5.6 2.6 0 4.9 1.1 6.2 2.9 1-2 2-2.7 2-2.7s-.5 2.3-.5 4.9.5 4.9.5 4.9-1-.7-2-2c-1.3 1.8-3.6 2.9-6.2 2.9-4 0-7-2.6-7-5.6z" />
      <path d="M8.8 12c-1.7 0-4.3.9-6.8 3 .8-2 .8-4 0-6 2.5 2.1 5.1 3 6.8 3z" />
      <circle cx="18.4" cy="10.8" r="1.1" fill={accent} />
    </IconBase>
  )
}
