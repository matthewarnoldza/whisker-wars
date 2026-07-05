import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function BackpackIcon({ accent = 'rgba(0,0,0,0.32)', ...props }: IconProps) {
  return (
    <IconBase accent={accent} {...props}>
      <path d="M8 5.4a4 4 0 0 1 8 0V6h1a3 3 0 0 1 3 3v9.6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a3 3 0 0 1 3-3h1v-.6zm2 .6h4v-.6a2 2 0 0 0-4 0V6z" />
      <path d="M8 13h8v4.4a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V13z" fill={accent} />
      <rect x="10.8" y="14.4" width="2.4" height="2.6" rx="1.1" fill="currentColor" />
    </IconBase>
  )
}
