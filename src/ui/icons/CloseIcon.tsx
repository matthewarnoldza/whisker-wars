import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function CloseIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5.8 5.8l12.4 12.4M18.2 5.8L5.8 18.2" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" />
    </IconBase>
  )
}
