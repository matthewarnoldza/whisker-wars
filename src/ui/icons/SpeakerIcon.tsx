import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function SpeakerIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3.5 8.8v6.4h3.9L13 20V4L7.4 8.8H3.5z" />
      <path d="M16 8.4a4.2 4.2 0 0 1 0 7.2M18.6 5.6a7.6 7.6 0 0 1 0 12.8" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </IconBase>
  )
}
