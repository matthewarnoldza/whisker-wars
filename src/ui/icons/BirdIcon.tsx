import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function BirdIcon({ accent = 'rgba(0,0,0,0.32)', ...props }: IconProps) {
  return (
    <IconBase accent={accent} {...props}>
      <path d="M3.6 13.4a6.2 6.2 0 0 1 6.2-6.2c1.8 0 2.9.5 3.8-.4.9-.9 1-2.4 2-2.4.9 0 1.1 1.1 1.1 2.1s2 1.4 2 3.5c0 1.1-.6 1.9-1.7 2.2.5 5.1-3.6 8.7-8.2 8.7-3.1 0-5.6-2-5.6-4.6 0-.9.5-1.7 1.1-2.2z" />
      <circle cx="16.4" cy="8.4" r="1" fill={accent} />
      <path d="M20.4 8.1l3.2-.6-2.7 2.2-.5-1.6z" />
    </IconBase>
  )
}
