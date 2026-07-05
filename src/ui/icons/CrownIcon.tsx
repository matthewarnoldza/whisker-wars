import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function CrownIcon({ accent = 'rgba(0,0,0,0.32)', ...props }: IconProps) {
  return (
    <IconBase accent={accent} {...props}>
      <path d="M2.6 7.4l4 4L12 4l5.4 7.4 4-4-1.6 11.3H4.2L2.6 7.4z" />
      <rect x="4" y="17.6" width="16" height="2.7" rx="1.1" />
      <g fill={accent}>
        <circle cx="6.7" cy="14" r="1" />
        <circle cx="12" cy="12.8" r="1.15" />
        <circle cx="17.3" cy="14" r="1" />
      </g>
    </IconBase>
  )
}
