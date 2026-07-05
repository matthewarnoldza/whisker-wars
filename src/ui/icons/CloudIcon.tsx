import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function CloudIcon({ accent = 'rgba(0,0,0,0.32)', ...props }: IconProps) {
  return (
    <IconBase accent={accent} {...props}>
      <path d="M7 18.6a5 5 0 0 1-.6-9.96A6.2 6.2 0 0 1 18.3 9.4a4.4 4.4 0 0 1-1.1 9.2H7z" />
    </IconBase>
  )
}
