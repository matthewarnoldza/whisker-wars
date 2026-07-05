import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function FeatherIcon({ accent = 'rgba(0,0,0,0.32)', ...props }: IconProps) {
  return (
    <IconBase accent={accent} {...props}>
      <path d="M20.4 3.6c-6.2 0-12.4 3.1-14.5 11.4l-2.1 4.2 1.7 1.1 1.9-2.3C15 17.6 20.4 11 20.4 3.6z" />
      <path d="M6 18.3L18 6.1" fill="none" stroke={accent} strokeWidth="1.3" strokeLinecap="round" />
      <path d="M9 13.3l3.6.2M11.5 10.6l3.2.2" fill="none" stroke={accent} strokeWidth="1.1" strokeLinecap="round" />
    </IconBase>
  )
}
