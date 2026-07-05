import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function ChevronUpIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 15l7-7 7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  )
}
