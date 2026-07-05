import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function MusicIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9 5.3l10.2-2.1v3.1L9 8.4V5.3z" />
      <rect x="7.9" y="4.9" width="1.9" height="12.2" rx="0.9" />
      <rect x="17.3" y="2.7" width="1.9" height="11.6" rx="0.9" />
      <ellipse cx="6.9" cy="17.6" rx="3.1" ry="2.5" />
      <ellipse cx="16.3" cy="14.7" rx="3.1" ry="2.5" />
    </IconBase>
  )
}
