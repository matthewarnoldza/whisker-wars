import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function CartIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="9.2" cy="20" r="1.7" />
      <circle cx="17.2" cy="20" r="1.7" />
      <path d="M2 3.4h2.7l2.1 12.2h11.4l2-8.6H6.3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  )
}
