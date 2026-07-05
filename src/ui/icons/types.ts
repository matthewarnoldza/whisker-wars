import type { SVGProps } from 'react'

/**
 * Shared props for every Whisker Wars icon.
 *
 * Design contract:
 * - Icons are filled silhouettes on a 24x24 grid. The main fill is `currentColor`
 *   so any Tailwind `text-*` class (e.g. `text-amber-400`) colors them, and they
 *   scale with `font-size` because the default `size` is `'1em'`.
 * - `accent` supplies the secondary tone for two-tone icons (e.g. the darker rim
 *   and paw stamp on the gold coin, gem facets, skull sockets). Icons that are
 *   single-tone ignore it. Default accent is a soft shade of the main color.
 * - When `title` is provided the icon is announced to screen readers
 *   (`role="img"` + `<title>`). When omitted it is treated as decorative
 *   (`aria-hidden`), which is the right default for icons sitting next to text.
 */
export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'children' | 'ref'> {
  /** Width & height. Defaults to `'1em'` so the icon tracks surrounding text size. */
  size?: number | string
  /** Accessible label. Presence flips the icon from decorative to announced. */
  title?: string
  /** Secondary tone for two-tone icons. Defaults to a soft shade. */
  accent?: string
}
