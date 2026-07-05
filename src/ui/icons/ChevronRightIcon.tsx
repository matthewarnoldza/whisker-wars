import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function ChevronRightIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  )
}
