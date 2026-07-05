import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function BoxIcon({ accent = 'rgba(0,0,0,0.32)', ...props }: IconProps) {
  return (
    <IconBase accent={accent} {...props}>
      <path d="M12 2.2l9.2 4.6v10.4L12 21.8l-9.2-4.6V6.8L12 2.2z" />
      <path d="M2.8 6.8L12 11.4l9.2-4.6M12 11.4v10.4" fill="none" stroke={accent} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M7 4.6l9.2 4.6" fill="none" stroke={accent} strokeWidth="1.4" />
    </IconBase>
  )
}
