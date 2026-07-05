import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function DogIcon({ accent = 'rgba(0,0,0,0.32)', ...props }: IconProps) {
  return (
    <IconBase accent={accent} {...props}>
      <path d="M4.6 4.6c1.6-1 3.7-.4 4.7 1.2A7.2 7.2 0 0 1 12 5.3c1 0 1.9.2 2.7.5C15.7 4.2 17.8 3.6 19.4 4.6c1.1.7 1.3 2.2.6 3.7.3.8.5 1.7.5 2.6 0 4.6-3.8 7.8-8.5 7.8S3.5 15.5 3.5 10.9c0-.9.2-1.8.5-2.6-.7-1.5-.5-3 .6-3.7z" />
      <g fill={accent}>
        <circle cx="9.4" cy="11" r="1.15" />
        <circle cx="14.6" cy="11" r="1.15" />
        <ellipse cx="12" cy="14.6" rx="2.3" ry="1.7" />
        <circle cx="12" cy="13.7" r="0.95" fill="currentColor" />
      </g>
    </IconBase>
  )
}
