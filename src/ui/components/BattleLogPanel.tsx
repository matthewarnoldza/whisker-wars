import { forwardRef } from 'react'

export interface BattleLog {
  text: string
  type?: 'damage' | 'heal' | 'crit' | 'info'
}

interface BattleLogPanelProps {
  logs: BattleLog[]
  variant: 'mobile' | 'desktop'
}

const BattleLogPanel = forwardRef<HTMLDivElement, BattleLogPanelProps>(
  ({ logs, variant }, ref) => {
    const displayLogs = variant === 'mobile' ? logs.slice(-12) : logs

    const getColor = (type?: string) => {
      switch (type) {
        case 'crit': return 'text-yellow-400 font-bold'
        case 'damage': return 'text-red-400'
        case 'heal': return 'text-emerald-400'
        default: return 'text-slate-300'
      }
    }

    if (variant === 'mobile') {
      return (
        <div
          ref={ref}
          role="log"
          aria-live="polite"
          aria-label="Battle log"
          className="bg-slate-900/90 rounded-lg p-2 border border-slate-700/50 h-[180px] overflow-y-auto custom-scrollbar"
        >
          {displayLogs.map((l, i) => (
            <div key={i} className={`text-xs font-medium leading-relaxed mb-1 ${getColor(l.type)}`}>
              {l.text}
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
        className="w-64 h-80 bg-slate-900/80 backdrop-blur-sm rounded-lg p-3 overflow-y-auto border border-slate-700 text-xs font-mono shadow-fantasy custom-scrollbar"
      >
        {displayLogs.map((l, i) => (
          <div key={i} className={`mb-1 ${getColor(l.type)}`}>
            {l.text}
          </div>
        ))}
      </div>
    )
  }
)

BattleLogPanel.displayName = 'BattleLogPanel'

export default BattleLogPanel
