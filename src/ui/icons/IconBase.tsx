import type { ReactNode } from 'react'
import type { IconProps } from './types'

interface IconBaseProps extends IconProps {
  children: ReactNode
}

/**
 * The single <svg> shell every icon renders through. Owns the shared 24x24
 * viewBox, the `1em` default sizing, `currentColor` fill inheritance, and the
 * a11y wiring. `accent` is stripped here so it never leaks onto the DOM node
 * for single-tone icons that receive it accidentally.
 */
export function IconBase({
  size = '1em',
  title,
  className,
  children,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  accent: _accent,
  ...rest
}: IconBaseProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  )
}
