import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function BulbIcon({ accent = 'rgba(0,0,0,0.32)', ...props }: IconProps) {
  return (
    <IconBase accent={accent} {...props}>
      <path d="M12 2a7 7 0 0 0-4.1 12.7c.75.6 1.1 1.3 1.1 2.1v.4h6v-.4c0-.8.35-1.5 1.1-2.1A7 7 0 0 0 12 2z" />
      <rect x="9" y="18" width="6" height="2.1" rx="1" fill={accent} />
      <rect x="10" y="20.6" width="4" height="1.8" rx="0.9" fill={accent} />
    </IconBase>
  )
}
