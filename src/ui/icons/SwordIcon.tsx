import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function SwordIcon({ accent = 'rgba(0,0,0,0.32)', ...props }: IconProps) {
  return (
    <IconBase accent={accent} {...props}>
      <path d="M12 2l2.3 2.3v9.6h-4.6V4.3L12 2z" />
      <path d="M11.6 6.5h.8v6h-.8z" fill={accent} />
      <rect x="6.8" y="13.6" width="10.4" height="2.4" rx="1.1" />
      <rect x="10.7" y="15.6" width="2.6" height="4.1" />
      <circle cx="12" cy="20.7" r="1.7" />
    </IconBase>
  )
}
