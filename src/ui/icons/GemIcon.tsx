import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function GemIcon({ accent = 'rgba(0,0,0,0.32)', ...props }: IconProps) {
  return (
    <IconBase accent={accent} {...props}>
      <path d="M6.2 2.8h11.6l3.6 5.5L12 21.4 2.6 8.3l3.6-5.5z" />
      <g fill="none" stroke={accent} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round">
        <path d="M2.6 8.3h18.8" />
        <path d="M8.4 2.8L6.8 8.3 12 21.4M15.6 2.8l1.6 5.5L12 21.4" />
      </g>
    </IconBase>
  )
}
