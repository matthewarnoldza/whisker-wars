import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function GiftIcon({ accent = 'rgba(0,0,0,0.32)', ...props }: IconProps) {
  return (
    <IconBase accent={accent} {...props}>
      <path d="M12 6.5C11.2 3.6 8 3.4 8 5.6c0 1.5 2.2 1.9 4 .9zm0 0c.8-2.9 4-3.1 4-.9 0 1.5-2.2 1.9-4 .9z" />
      <rect x="2.5" y="6.8" width="19" height="4.4" rx="1.4" />
      <path d="M4.3 11.4h15.4v8.4a1.6 1.6 0 0 1-1.6 1.6H5.9a1.6 1.6 0 0 1-1.6-1.6v-8.4z" />
      <rect x="10.6" y="6.8" width="2.8" height="14.6" fill={accent} />
    </IconBase>
  )
}
