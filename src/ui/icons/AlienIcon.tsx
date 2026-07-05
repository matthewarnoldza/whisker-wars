import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function AlienIcon({ accent = 'rgba(0,0,0,0.32)', ...props }: IconProps) {
  return (
    <IconBase accent={accent} {...props}>
      <path d="M12 2c5 0 8.2 3.6 8.2 8.2 0 5.1-4.1 9.2-8.2 11.8-4.1-2.6-8.2-6.7-8.2-11.8C3.8 5.6 7 2 12 2z" />
      <g fill={accent}>
        <path d="M8.8 8.6c-1.7 0-2.9 1.3-2.9 2.9s2.3 3.4 4 3.4 1.7-2.3 1.1-4.1c-.4-1.4-1.2-2.2-2.2-2.2z" />
        <path d="M15.2 8.6c1.7 0 2.9 1.3 2.9 2.9s-2.3 3.4-4 3.4-1.7-2.3-1.1-4.1c.4-1.4 1.2-2.2 2.2-2.2z" />
      </g>
    </IconBase>
  )
}
