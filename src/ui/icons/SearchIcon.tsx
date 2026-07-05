import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function SearchIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="10.5" cy="10.5" r="6.6" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path d="M15.4 15.4l5.4 5.4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </IconBase>
  )
}
