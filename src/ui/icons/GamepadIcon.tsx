import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function GamepadIcon({ accent = 'rgba(0,0,0,0.32)', ...props }: IconProps) {
  return (
    <IconBase accent={accent} {...props}>
      <path d="M7 7.6h10a5 5 0 0 1 4.96 5.7l-.5 3.5A2.7 2.7 0 0 1 16.9 18l-1.9-2.6H9l-1.9 2.6a2.7 2.7 0 0 1-4.86-1.55l-.5-3.5A5 5 0 0 1 7 7.6z" />
      <g fill={accent}>
        <rect x="5.2" y="11.5" width="4.2" height="1.5" rx="0.75" />
        <rect x="6.55" y="10.15" width="1.5" height="4.2" rx="0.75" />
        <circle cx="15.6" cy="11.4" r="1.05" />
        <circle cx="17.7" cy="13.5" r="1.05" />
      </g>
    </IconBase>
  )
}
