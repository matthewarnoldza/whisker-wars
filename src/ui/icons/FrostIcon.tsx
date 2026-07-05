import { IconBase } from './IconBase'
import type { IconProps } from './types'

export function FrostIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20M3.3 7l17.4 10M20.7 7L3.3 17" />
        <path d="M9.2 3.7L12 5.4l2.8-1.7M9.2 20.3L12 18.6l2.8 1.7" />
        <path d="M4.8 8.8l.4 3.2 2.8-1.6M19.2 8.8l-.4 3.2-2.8-1.6" />
        <path d="M4.8 15.2l2.8-1.6-.4 3.2M19.2 15.2l-2.8-1.6.4 3.2" />
      </g>
    </IconBase>
  )
}
