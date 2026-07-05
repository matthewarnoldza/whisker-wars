import React, { useEffect } from 'react'
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion'
import Avatar from './Avatar'
import type { Cat, Dog } from '../../game/data'
import { useHolographicCard } from '../hooks/useHolographicCard'
import { isWeb } from '../../utils/platform'
import { RARITY_GRADIENTS, RARITY_GLOWS } from '../constants/rarity'
import { getEquipmentBonuses } from '../../game/items'
import { useJuiceEnabled } from '../animations'

// ===== Combat "juice" hit-feedback signal =====
// A one-shot effect pulse pushed by the battle views when this card is struck /
// healed / dodges / is afflicted. `key` must change every trigger (it drives the
// flash-overlay remount + recoil replay). dx/dy = recoil nudge direction (px),
// pointed AWAY from the attacker so the struck card visibly recoils.
export type CardFxKind = 'hit' | 'crit' | 'heal' | 'dodge' | 'poison' | 'burn' | 'ability'
export interface CardFx {
  key: number
  kind: CardFxKind
  dx?: number
  dy?: number
}

const FX_OVERLAY: Record<CardFxKind, { style: React.CSSProperties; opacity: number; dur: number } | null> = {
  // TODO(design-tokens): promote these hit-flash colors to the shared palette.
  hit: { style: { background: '#FFFFFF', mixBlendMode: 'screen' }, opacity: 0.82, dur: 0.11 },
  crit: { style: { background: '#FFC53D', mixBlendMode: 'screen' }, opacity: 0.92, dur: 0.14 },
  heal: { style: { background: 'radial-gradient(circle at 50% 60%, rgba(61,220,132,0.9), transparent 70%)' }, opacity: 0.5, dur: 0.4 },
  ability: { style: { background: 'radial-gradient(circle at 50% 50%, rgba(167,139,250,0.85), transparent 70%)' }, opacity: 0.55, dur: 0.32 },
  poison: { style: { boxShadow: 'inset 0 0 22px 6px rgba(74,222,128,0.85)' }, opacity: 0.75, dur: 0.5 },
  burn: { style: { boxShadow: 'inset 0 0 22px 6px rgba(251,146,60,0.85)' }, opacity: 0.75, dur: 0.5 },
  dodge: null,
}

// Stable style references to prevent Firefox animation restarts on re-render
const DELAY_0 = { animationDelay: '0s' } as const
const DELAY_02 = { animationDelay: '0.2s' } as const
const DELAY_04 = { animationDelay: '0.4s' } as const
const DELAY_05 = { animationDelay: '0.5s' } as const
const DELAY_06 = { animationDelay: '0.6s' } as const
const DELAY_08 = { animationDelay: '0.8s' } as const
const DELAY_1 = { animationDelay: '1s' } as const
const DELAY_12 = { animationDelay: '1.2s' } as const
const DELAY_15 = { animationDelay: '1.5s' } as const

interface GameCardProps {
    character: Cat | Dog
    isEnemy?: boolean
    onClick?: () => void
    selected?: boolean
    disabled?: boolean
    showStats?: boolean
    animate?: boolean
    holographicMode?: 'subtle' | 'full' | 'none'
    /** Combat juice hit-feedback pulse (battle arenas only). */
    fx?: CardFx | null
}

export default React.memo(function GameCard({
    character,
    isEnemy = false,
    onClick,
    selected = false,
    disabled = false,
    showStats = true,
    animate = true,
    holographicMode = 'full',
    fx = null
}: GameCardProps) {

    const isCat = !isEnemy

    // ===== Combat juice: impact flash + directional recoil =====
    const juiceEnabled = useJuiceEnabled()
    const recoilControls = useAnimationControls()
    const fxKey = fx?.key
    useEffect(() => {
        if (!fx || !juiceEnabled) return
        const { kind, dx = 0, dy = 0 } = fx
        if (kind === 'dodge') {
            void recoilControls.start({ x: [0, dx || 16, 0], transition: { duration: 0.26, ease: 'easeOut' } })
        } else if (kind === 'heal') {
            void recoilControls.start({ scale: [1, 1.04, 1], transition: { duration: 0.3, ease: 'easeOut' } })
        } else if (kind === 'ability') {
            void recoilControls.start({ scale: [1, 1.06, 1], transition: { duration: 0.3, ease: 'easeOut' } })
        } else if (kind === 'hit' || kind === 'crit') {
            void recoilControls.start({ x: [0, dx, 0], y: [0, dy, 0], scale: [1, 0.97, 1], transition: { duration: 0.2, ease: 'easeOut' } })
        }
        // poison / burn: rim-only pulse, no positional recoil
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fxKey])
    const overlay = fx ? FX_OVERLAY[fx.kind] : null
    const rarity = (character as Cat).rarity || 'Common'
    const isElite = (character as any).isElite === true
    const eliteTier = (character as any).eliteTier || 0
    const ascension = (character as any).ascension || 0
    const equipBonuses = getEquipmentBonuses((character as any).equipment)

    // Holographic effect - elite cats get max shine intensity
    const holographic = useHolographicCard({
        mode: holographicMode === 'none' ? 'subtle' : holographicMode,
        maxRotation: holographicMode === 'full' ? 15 : 8,
        shineIntensity: isElite ? 0.9 : rarity === 'Mythical' ? 0.8 : rarity === 'Legendary' ? 0.7 : 0.6,
        enableMobile: !disabled && animate && holographicMode !== 'none',
        enableWeb: !disabled && animate && holographicMode !== 'none'
    })

    const rarityGradient = RARITY_GRADIENTS[rarity] || RARITY_GRADIENTS['Common']
    const rarityGlow = RARITY_GLOWS[rarity] || RARITY_GLOWS['Common']

    // Determine if card should have special animations
    const hasSpecialGlow = rarity === 'Mythical' || rarity === 'Legendary' || isElite
    const rarityAnimationClass = isElite
        ? (eliteTier >= 2 ? 'prismatic-glow' : 'elite-glow')
        : rarity === 'Mythical' ? 'mythical-glow' : rarity === 'Legendary' ? 'legendary-glow' : ''

    return (
        <motion.div
            ref={holographic.cardRef}
            className={`relative w-52 h-80 select-none cursor-pointer holographic-card ${disabled ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
            style={holographic.style}
            {...(holographic.isSupported && holographicMode !== 'none' ? (isWeb() ? {
                onMouseMove: holographic.handlers.onMouseMove,
                onMouseLeave: holographic.handlers.onMouseLeave
            } : {
                onTouchMove: holographic.handlers.onTouchMove,
                onTouchEnd: holographic.handlers.onTouchEnd
            }) : {})}
            whileHover={!disabled && animate ? { scale: 1.05 } : {}}
            whileTap={!disabled && animate ? { scale: 0.98 } : {}}
            onClick={!disabled ? onClick : undefined}
            initial={animate ? { opacity: 0, y: 20 } : {}}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
        >
            {/* Selection Glow */}
            {selected && (
                <div className="absolute -inset-3 bg-gradient-to-r from-gold-500/50 via-purple-500/50 to-gold-500/50 rounded-2xl blur-xl animate-pulse-glow" />
            )}

            {/* Holographic Overlay - z-index 2, below mythical particles */}
            {holographic.isSupported && holographicMode !== 'none' && (
                <div
                    className={`holographic-overlay ${holographicMode} ${holographic.isActive ? 'active' : ''} rarity-${rarity.toLowerCase()}`}
                />
            )}

            {/* Mythical Particles */}
            {rarity === 'Mythical' && !isElite && (
                <>
                    <div className="absolute top-4 left-4 w-2 h-2 bg-red-500 rounded-full mythical-particle" style={DELAY_0} />
                    <div className="absolute top-8 right-6 w-2 h-2 bg-red-400 rounded-full mythical-particle" style={DELAY_05} />
                    <div className="absolute bottom-12 left-8 w-2 h-2 bg-rose-500 rounded-full mythical-particle" style={DELAY_1} />
                    <div className="absolute bottom-6 right-4 w-2 h-2 bg-red-600 rounded-full mythical-particle" style={DELAY_15} />
                </>
            )}

            {/* Elite Particles */}
            {isElite && (
                <>
                    <div className="absolute top-6 left-6 w-2 h-2 bg-yellow-400 rounded-full elite-particle z-[4]" style={DELAY_0} />
                    <div className="absolute top-10 right-8 w-2 h-2 bg-cyan-400 rounded-full elite-particle z-[4]" style={DELAY_04} />
                    <div className="absolute bottom-14 left-10 w-2 h-2 bg-yellow-300 rounded-full elite-particle z-[4]" style={DELAY_08} />
                    <div className="absolute bottom-8 right-6 w-2 h-2 bg-cyan-300 rounded-full elite-particle z-[4]" style={DELAY_12} />
                    {eliteTier >= 2 && (
                        <>
                            <div className="absolute top-16 left-4 w-2 h-2 bg-pink-400 rounded-full elite-particle z-[4]" style={DELAY_02} />
                            <div className="absolute bottom-20 right-10 w-2 h-2 bg-purple-400 rounded-full elite-particle z-[4]" style={DELAY_06} />
                        </>
                    )}
                </>
            )}

            {/* Elite Badge */}
            {isElite && (
                <div className="absolute top-2 right-2 z-20 flex items-center gap-1 px-2 py-1 rounded-md bg-gradient-to-r from-yellow-500 to-amber-400 border border-white/50 shadow-lg">
                    <span className="text-xs text-slate-900">&#x2726;</span>
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-wider">
                        {eliteTier >= 2 ? 'PRISMATIC' : 'ELITE'}
                    </span>
                </div>
            )}

            {/* Ascension Stars */}
            {ascension > 0 && (
                <div className="absolute top-2 left-2 z-20 flex gap-0.5">
                    {Array.from({ length: ascension }).map((_, i) => (
                        <span key={i} className="text-amber-400 text-xs drop-shadow-[0_0_4px_rgba(251,191,36,0.8)]">★</span>
                    ))}
                </div>
            )}

            {/* Card Container with Rarity Glow */}
            <motion.div
                animate={recoilControls}
                className={`relative z-[3] isolate w-full h-full rounded-2xl overflow-hidden shadow-premium-lg ring-1 ring-white/10 ${rarityGlow} ${hasSpecialGlow ? rarityAnimationClass : ''}`}
            >

                {/* Full-Bleed Character Art - No Border */}
                <div className="absolute inset-0 rounded-2xl overflow-hidden">
                    {character.imageUrl ? (
                        <img
                            src={character.imageUrl}
                            alt={isCat ? `${character.name}, ${rarity} cat` : `${character.name}, enemy dog`}
                            width={832}
                            height={1280}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                            style={{ aspectRatio: '832 / 1280' }}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 scale-150">
                            <Avatar seed={character.id} kind={isEnemy ? 'dog' : 'cat'} />
                        </div>
                    )}

                    {/* Minimal Gradient Overlays - only at top and bottom */}
                    <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/60 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                </div>

                {/* Card Content Overlay */}
                <div className="relative z-10 h-full flex flex-col justify-between p-4">

                    {/* Top: Enhanced Name Badge */}
                    <div className="flex flex-col items-center gap-1">
                        <div className={`px-4 py-2 rounded-lg bg-gradient-to-br ${rarityGradient} shadow-xl border-2 border-white/50`}>
                            <h3 className="font-black text-sm tracking-wider text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] uppercase">
                                {character.name}
                            </h3>
                        </div>
                        {isCat && (
                            <div className="px-3 py-1 rounded-md bg-black/80 border border-white/20 shadow-md">
                                <span className="text-[9px] text-slate-200 uppercase tracking-widest font-bold">
                                    {(character as Cat).breed}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Bottom Section: Ability + Stats */}
                    <div className="flex flex-col gap-1">
                        {/* Enhanced Ability - Always render */}
                        <div className="px-2 py-1.5 bg-black rounded-lg border-2 border-gold-500 shadow-lg flex-shrink-0">
                            <div className="text-[11px] font-black text-gold-400 tracking-wider uppercase text-center leading-tight">
                                {character.ability?.name || 'ABILITY'}
                            </div>
                            {character.ability?.description && (
                                <p className="text-[10px] text-white leading-tight text-center line-clamp-1 mt-0.5">
                                    {character.ability.description}
                                </p>
                            )}
                        </div>

                        {/* Vintage Stats */}
                        {showStats && (
                            <div className="flex justify-between items-center px-1 flex-shrink-0">
                                {/* Attack */}
                                <div className="flex flex-col items-center gap-0.5">
                                    <div className="w-9 h-9 bg-black rounded border-2 border-amber-500 flex items-center justify-center shadow-stat">
                                        <span className="font-black text-amber-400 text-base text-shadow-stat">{((character as any).currentAttack || character.attack) + equipBonuses.atkBonus}</span>
                                    </div>
                                    <span className="text-[8px] text-amber-200 font-bold tracking-wide uppercase">ATK</span>
                                </div>

                                {/* Level */}
                                {(character as any).level !== undefined && (
                                    <div className="px-2 py-0.5 bg-black rounded border-2 border-slate-400 shadow-stat">
                                        <div className="flex flex-col items-center">
                                            <span className="text-[7px] text-slate-300 font-bold tracking-wide leading-none">LVL</span>
                                            <span className="text-base font-black text-white leading-none text-shadow-stat">{(character as any).level}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Health */}
                                <div className="flex flex-col items-center gap-0.5">
                                    <div className="w-11 h-9 bg-black rounded border-2 border-emerald-500 flex items-center justify-center shadow-stat px-1">
                                        <span className="font-black text-emerald-400 text-xs text-shadow-stat">
                                            {(character as any).currentHp !== undefined && (character as any).maxHp !== undefined
                                                ? `${(character as any).currentHp + equipBonuses.hpBonus}/${(character as any).maxHp + equipBonuses.hpBonus}`
                                                : ((character as any).currentHp || character.health || 0) + equipBonuses.hpBonus}
                                        </span>
                                    </div>
                                    <span className="text-[8px] text-emerald-200 font-bold tracking-wide uppercase">HP</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Combat juice: impact flash / heal glow / DoT rim (clipped to card radius) */}
                <AnimatePresence>
                    {overlay && (
                        <motion.div
                            key={fx!.key}
                            className="absolute inset-0 rounded-2xl pointer-events-none z-[25]"
                            style={overlay.style}
                            initial={{ opacity: overlay.opacity }}
                            animate={{ opacity: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: overlay.dur, ease: 'easeOut' }}
                        />
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    )
})
