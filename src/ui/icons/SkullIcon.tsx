import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function SkullIcon({ accent = 'rgba(0,0,0,0.32)', ...props }: IconProps) {
  return (
    <IconBase accent={accent} {...props}>
      <path d="M12 2.2C6.9 2.2 3.3 5.7 3.3 10.4c0 2.7 1.2 4.5 2.6 5.7v2.3a2 2 0 0 0 2 2h1.1v-2h2v2h2v-2h1.1a2 2 0 0 0 2-2v-2.3c1.4-1.2 2.6-3 2.6-5.7 0-4.7-3.6-8.2-8.7-8.2z" />
      <g fill={accent}>
        <circle cx="8.5" cy="10.3" r="2" />
        <circle cx="15.5" cy="10.3" r="2" />
        <path d="M12 12.6l1.4 2.5h-2.8L12 12.6z" />
      </g>
    </IconBase>
  )
}
