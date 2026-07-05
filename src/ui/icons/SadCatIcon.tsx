import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function SadCatIcon({ accent = 'rgba(0,0,0,0.32)', ...props }: IconProps) {
  return (
    <IconBase accent={accent} {...props}>
      <path d="M3.8 3l3.7 3.4A9.1 9.1 0 0 1 12 5.1c1.6 0 3.2.4 4.5 1.3L20.2 3l-.6 5.4c.4.9.6 1.9.6 2.9 0 4.7-3.7 8.1-8.2 8.1S3.8 16 3.8 11.3c0-1 .2-2 .6-2.9L3.8 3z" />
      <g fill={accent}>
        <path d="M7.6 10.2l2.4 1.6M16.4 10.2l-2.4 1.6" stroke={accent} strokeWidth="1.4" strokeLinecap="round" fill="none" />
        <path d="M9.4 15.8a3 3 0 0 1 5.2 0" fill="none" stroke={accent} strokeWidth="1.4" strokeLinecap="round" />
        <path d="M8.4 12.6c0 1.3-1.1 2.1-1.1 3.2a1.1 1.1 0 0 0 2.2 0c0-1.1-1.1-1.9-1.1-3.2z" />
      </g>
    </IconBase>
  )
}
