import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function EventIcon({ accent = 'rgba(0,0,0,0.32)', ...props }: IconProps) {
  return (
    <IconBase accent={accent} {...props}>
      <path d="M12 2v3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 4.4c-4.3 1-8.4 4.2-9.4 8.4h18.8c-1-4.2-5.1-7.4-9.4-8.4z" />
      <path d="M2.6 12.4h18.8v8.2a1.2 1.2 0 0 1-1.2 1.2h-5V15.8h-3.6v6.2H3.8a1.2 1.2 0 0 1-1.2-1.2v-8.2z" />
      <path d="M8.4 12.4L10 5.2M15.6 12.4L14 5.2" fill="none" stroke={accent} strokeWidth="1.3" strokeLinecap="round" />
    </IconBase>
  )
}
