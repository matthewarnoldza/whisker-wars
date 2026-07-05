import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function ShieldIcon({ accent = 'rgba(0,0,0,0.32)', ...props }: IconProps) {
  return (
    <IconBase accent={accent} {...props}>
      <path d="M12 2.4l7.4 2.5v5.8c0 4.9-3.1 8.6-7.4 10-4.3-1.4-7.4-5.1-7.4-10V4.9L12 2.4z" />
      <path d="M8.7 11.5l2.4 2.4 4.4-4.9" fill="none" stroke={accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  )
}
