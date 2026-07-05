import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function BookIcon({ accent = 'rgba(0,0,0,0.32)', ...props }: IconProps) {
  return (
    <IconBase accent={accent} {...props}>
      <path d="M12 5.4C10.3 4.1 7.9 3.5 5.4 3.8A1.6 1.6 0 0 0 4 5.4v11.2a1.6 1.6 0 0 0 1.6 1.6c2.4-.3 4.8.3 6.4 1.6 1.6-1.3 4-1.9 6.4-1.6A1.6 1.6 0 0 0 20 16.6V5.4a1.6 1.6 0 0 0-1.6-1.6c-2.5-.3-4.9.3-6.4 1.6z" />
      <path d="M12 5.4v13.4" fill="none" stroke={accent} strokeWidth="1.3" strokeLinecap="round" />
      <path d="M6.5 8.2l3.2.5M6.5 11l3.2.5M17.5 8.2l-3.2.5M17.5 11l-3.2.5" fill="none" stroke={accent} strokeWidth="1.1" strokeLinecap="round" />
    </IconBase>
  )
}
