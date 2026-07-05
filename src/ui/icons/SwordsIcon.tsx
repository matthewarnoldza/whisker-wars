import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function SwordsIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M18.7 3.2l2.1.1.1 2.1-9 9-2.2-2.2 9-9z" />
      <path d="M5.3 3.2l-2.1.1-.1 2.1 9 9 2.2-2.2-9-9z" />
      <rect x="14.9" y="14.3" width="2.2" height="6.4" rx="1" transform="rotate(-45 16 17.5)" />
      <rect x="6.9" y="14.3" width="2.2" height="6.4" rx="1" transform="rotate(45 8 17.5)" />
      <path d="M14.2 15.6l4.2 4.2M9.8 15.6l-4.2 4.2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </IconBase>
  )
}
