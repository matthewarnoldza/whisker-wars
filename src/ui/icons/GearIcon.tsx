import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function GearIcon({ accent = 'rgba(0,0,0,0.32)', ...props }: IconProps) {
  return (
    <IconBase accent={accent} {...props}>
      <path fillRule="evenodd" clipRule="evenodd" d="M19.4 12c0-.42-.04-.83-.1-1.23l2.02-1.58-2-3.46-2.38 1a7 7 0 0 0-2.13-1.23L14.4 2.9H10.4l-.42 2.6a7 7 0 0 0-2.13 1.23l-2.38-1-2 3.46 2.02 1.58c-.06.4-.1.81-.1 1.23s.04.83.1 1.23l-2.02 1.58 2 3.46 2.38-1a7 7 0 0 0 2.13 1.23l.42 2.6h4l.42-2.6a7 7 0 0 0 2.13-1.23l2.38 1 2-3.46-2.02-1.58c.06-.4.1-.81.1-1.23zM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z" />
    </IconBase>
  )
}
