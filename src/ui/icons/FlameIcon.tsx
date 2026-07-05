import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function FlameIcon({ accent = 'rgba(0,0,0,0.32)', ...props }: IconProps) {
  return (
    <IconBase accent={accent} {...props}>
      <path d="M12 22a7 7 0 0 0 7-7c0-3.1-1.9-5.6-3.5-7.6-.5 1.3-1.3 2.1-2.3 2.1 1.1-2.6.3-5.6-2.2-7.7-.1 3.1-2.1 4.5-3.6 6.4A7.4 7.4 0 0 0 5 15a7 7 0 0 0 7 7z" />
      <path d="M12 13c1.5.6 2.3 1.8 2.3 3.2a2.3 2.3 0 0 1-4.6 0c0-1.4 1-2.4 2.3-3.2z" fill={accent} />
    </IconBase>
  )
}
