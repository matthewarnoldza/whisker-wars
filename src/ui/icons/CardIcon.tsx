import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function CardIcon({ accent = 'rgba(0,0,0,0.32)', ...props }: IconProps) {
  return (
    <IconBase accent={accent} {...props}>
      <rect x="5.4" y="2.8" width="13.2" height="18.4" rx="2.4" />
      <g fill={accent}>
        <path d="M12 6.6c-.7-1.4-3-1.1-3 .9 0 1.5 3 3.3 3 3.3s3-1.8 3-3.3c0-2-2.3-2.3-3-.9z" />
        <circle cx="8.4" cy="16.4" r="1.1" />
        <circle cx="12" cy="17.4" r="1.1" />
        <circle cx="15.6" cy="16.4" r="1.1" />
      </g>
    </IconBase>
  )
}
