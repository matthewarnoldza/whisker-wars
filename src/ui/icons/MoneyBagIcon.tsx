import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function MoneyBagIcon({ accent = 'rgba(0,0,0,0.32)', ...props }: IconProps) {
  return (
    <IconBase accent={accent} {...props}>
      <path d="M8 6.2h8l-1.9-2.6.9-1-1.1-.8L12 3.9 10.2 1.8l-1.1.8.9 1L8 6.2z" />
      <path d="M8 6.2c-3 2.1-5 5.2-5 9.2A5.8 5.8 0 0 0 8.8 21h6.4A5.8 5.8 0 0 0 21 15.4c0-4-2-7.1-5-9.2H8z" />
      <path d="M12 9.7v7.4M10 11.3a2 2 0 0 1 4 0c0 1.1-1 1.4-2 1.7s-2 .6-2 1.7a2 2 0 0 0 4 0" fill="none" stroke={accent} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  )
}
