import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function MusicMutedIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9.8 5.1l9.4-1.9v3.1l-9.4 1.9V5.1z" />
      <rect x="8.7" y="4.7" width="1.9" height="12.4" rx="0.9" />
      <ellipse cx="7.7" cy="17.6" rx="3.1" ry="2.5" />
      <path d="M3.5 3.5l17 17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </IconBase>
  )
}
