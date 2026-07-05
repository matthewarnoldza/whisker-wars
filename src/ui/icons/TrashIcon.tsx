import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function TrashIcon({ accent = 'rgba(0,0,0,0.32)', ...props }: IconProps) {
  return (
    <IconBase accent={accent} {...props}>
      <path d="M6 7.2h12l-1 12.6a2 2 0 0 1-2 1.8H9a2 2 0 0 1-2-1.8L6 7.2z" />
      <rect x="3.8" y="4.8" width="16.4" height="2.6" rx="1.1" />
      <path d="M9 4.8V3.6A1.6 1.6 0 0 1 10.6 2h2.8A1.6 1.6 0 0 1 15 3.6v1.2" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M10 10.8v6.4M14 10.8v6.4" fill="none" stroke={accent} strokeWidth="1.4" strokeLinecap="round" />
    </IconBase>
  )
}
