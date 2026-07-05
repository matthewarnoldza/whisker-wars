import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function EditIcon({ accent = 'rgba(0,0,0,0.32)', ...props }: IconProps) {
  return (
    <IconBase accent={accent} {...props}>
      <path d="M4 20l1.1-4.2L15.6 5.3l3.1 3.1L8.2 18.9 4 20z" />
      <path d="M14.4 6.5l3.1 3.1" fill="none" stroke={accent} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M15.6 5.3l1.4-1.4a1.6 1.6 0 0 1 2.3 0l.8.8a1.6 1.6 0 0 1 0 2.3l-1.4 1.4-3.1-3.1z" />
    </IconBase>
  )
}
