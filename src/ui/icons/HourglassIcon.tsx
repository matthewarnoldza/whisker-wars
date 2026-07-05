import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function HourglassIcon({ accent = 'rgba(0,0,0,0.32)', ...props }: IconProps) {
  return (
    <IconBase accent={accent} {...props}>
      <path d="M6 3.4h12v1.1c0 3.1-3 5.1-3 7.5s3 4.4 3 7.5v1.1H6v-1.1c0-3.1 3-5.1 3-7.5s-3-4.4-3-7.5V3.4z" />
      <rect x="4.6" y="2" width="14.8" height="2.2" rx="1.1" />
      <rect x="4.6" y="19.8" width="14.8" height="2.2" rx="1.1" />
      <path d="M9.4 17.8c.8-1.6 2.6-1.6 2.6-1.6s1.8 0 2.6 1.6H9.4z" fill={accent} />
    </IconBase>
  )
}
