import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function SpeakerMutedIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3.5 8.8v6.4h3.9L13 20V4L7.4 8.8H3.5z" />
      <path d="M16.2 9.4l5.3 5.3M21.5 9.4l-5.3 5.3" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </IconBase>
  )
}
