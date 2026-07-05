import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function CatIcon({ accent = 'rgba(0,0,0,0.32)', ...props }: IconProps) {
  return (
    <IconBase accent={accent} {...props}>
      <path d="M3.8 3l3.7 3.4A9.1 9.1 0 0 1 12 5.1c1.6 0 3.2.4 4.5 1.3L20.2 3l-.6 5.4c.4.9.6 1.9.6 2.9 0 4.7-3.7 8.1-8.2 8.1S3.8 16 3.8 11.3c0-1 .2-2 .6-2.9L3.8 3z" />
      <g fill={accent}>
        <ellipse cx="9" cy="11" rx="1.15" ry="1.5" />
        <ellipse cx="15" cy="11" rx="1.15" ry="1.5" />
        <path d="M11 13.7h2l-1 1.3-1-1.3z" />
      </g>
      <path d="M8.4 13.2l-3 .6M8.4 14.6l-2.8 1.4M15.6 13.2l3 .6M15.6 14.6l2.8 1.4" fill="none" stroke={accent} strokeWidth="0.9" strokeLinecap="round" />
    </IconBase>
  )
}
