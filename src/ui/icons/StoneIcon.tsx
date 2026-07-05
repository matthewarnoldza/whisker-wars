import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function StoneIcon({ accent = 'rgba(0,0,0,0.32)', ...props }: IconProps) {
  return (
    <IconBase accent={accent} {...props}>
      <path d="M4.7 14.2c-1-3.1 1-6.1 4.1-7.2 2.1-.7 4.2-.5 6.2.5 2.1 1 3.6 3.1 3.6 5.7 0 3.1-2.6 5.2-6.2 5.2-3.6 0-6.5-1-7.7-4.2z" />
      <path d="M7.6 12.3l3.1-2.1 3.1 1.1 2.1 3.1" fill="none" stroke={accent} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" />
    </IconBase>
  )
}
