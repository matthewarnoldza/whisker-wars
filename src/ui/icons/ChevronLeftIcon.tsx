import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function ChevronLeftIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  )
}
