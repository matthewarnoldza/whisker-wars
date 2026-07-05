/** Join conditional class names (falsey values dropped). Tiny local helper —
 *  no runtime dep. Later-wins conflict resolution is the caller's job. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
