import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function LeafIcon({ accent = 'rgba(0,0,0,0.32)', ...props }: IconProps) {
  return (
    <IconBase accent={accent} {...props}>
      <path d="M4.8 19.2C4.8 11 10 4.9 19.2 3.8c1.1 9.2-5.2 14.4-13.4 15.5l-1 1.1v-1.2z" />
      <path d="M18 5.2C13 8.2 9 13.2 6 18.4" fill="none" stroke={accent} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M13.5 6.7l1.6 2.9M9.6 10.4l1.6 2.9" fill="none" stroke={accent} strokeWidth="1.2" strokeLinecap="round" />
    </IconBase>
  )
}
