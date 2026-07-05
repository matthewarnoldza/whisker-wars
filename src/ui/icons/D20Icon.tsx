import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function D20Icon({ accent = 'rgba(0,0,0,0.32)', ...props }: IconProps) {
  return (
    <IconBase accent={accent} {...props}>
      <path d="M12 1.8l8.7 5v10.4L12 22.2 3.3 17.2V6.8L12 1.8z" />
      <g fill="none" stroke={accent} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round">
        <path d="M12 6.3l5.2 8.9H6.8L12 6.3z" />
        <path d="M12 6.3V2.4M6.8 15.2l-3.5-2.1M17.2 15.2l3.5-2.1M8.7 19.5L12 15.2l3.3 4.3" />
      </g>
    </IconBase>
  )
}
