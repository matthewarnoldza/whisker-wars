import { forwardRef, Fragment, type ReactNode } from 'react'
import { ICON_FOR_EMOJI } from '../icons'

export interface BattleLog {
  text: string
  type?: 'damage' | 'heal' | 'crit' | 'info'
}

interface BattleLogPanelProps {
  logs: BattleLog[]
  variant: 'mobile' | 'desktop'
}

// ===== Render-time emoji → icon tokenizer =====
// The pure battle engine emits Log strings that embed functional emoji (⚔️ 💀
// 🎲 ✨ …). We never touch those strings in the engine; instead we swap the
// *known* emoji for inline icon components at render time. Unknown emoji (flavor
// glyphs with no icon in the map, e.g. 🎭 🐙 🧬) fall through as plain text.
//
// The split regex is compiled once from ICON_FOR_EMOJI's keys, longest-first so
// variation-selector forms (🛡️) match before their bare counterparts (🛡).
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const EMOJI_KEYS = Object.keys(ICON_FOR_EMOJI).sort((a, b) => b.length - a.length)
const EMOJI_SPLIT_RE = new RegExp(`(${EMOJI_KEYS.map(escapeRegex).join('|')})`)

/** Turn a log string into text + inline icon nodes. Cheap: one split, no scan. */
function renderLogText(text: string): ReactNode {
  if (!EMOJI_SPLIT_RE.test(text)) return text
  const parts = text.split(EMOJI_SPLIT_RE)
  return parts.map((part, i) => {
    const Icon = ICON_FOR_EMOJI[part]
    if (Icon) {
      return (
        <Icon
          key={i}
          className="inline-block shrink-0 align-[-0.125em]"
          aria-hidden
        />
      )
    }
    return <Fragment key={i}>{part}</Fragment>
  })
}

const BattleLogPanel = forwardRef<HTMLDivElement, BattleLogPanelProps>(
  ({ logs, variant }, ref) => {
    const displayLogs = variant === 'mobile' ? logs.slice(-12) : logs

    const getColor = (type?: string) => {
      switch (type) {
        case 'crit': return 'text-accent-300 font-bold'
        case 'damage': return 'text-danger-400'
        case 'heal': return 'text-success-400'
        default: return 'text-ink-muted'
      }
    }

    if (variant === 'mobile') {
      return (
        <div
          ref={ref}
          role="log"
          aria-live="polite"
          aria-label="Battle log"
          className="bg-surface/90 rounded-lg p-2 border border-surface-border h-[180px] overflow-y-auto custom-scrollbar"
        >
          {displayLogs.map((l, i) => (
            <div key={i} className={`text-xs font-medium leading-relaxed mb-1 ${getColor(l.type)}`}>
              {renderLogText(l.text)}
            </div>
          ))}
        </div>
      )
    }

    return (
      <div
        ref={ref}
        role="log"
        aria-live="polite"
        aria-label="Battle log"
        className="w-64 h-80 bg-surface/80 backdrop-blur-sm rounded-lg p-3 overflow-y-auto border border-surface-border text-xs font-mono shadow-fantasy custom-scrollbar"
      >
        {displayLogs.map((l, i) => (
          <div key={i} className={`mb-1 ${getColor(l.type)}`}>
            {renderLogText(l.text)}
          </div>
        ))}
      </div>
    )
  }
)

BattleLogPanel.displayName = 'BattleLogPanel'

export default BattleLogPanel
