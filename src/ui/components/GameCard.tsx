import React from 'react'
import { motion } from 'framer-motion'
import Avatar from './Avatar'
import type { Cat, Dog } from '../../game/data'
import { useHolographicCard } from '../hooks/useHolographicCard'
import { isWeb } from '../../utils/platform'

// Rarity lookup tables for O(1) access instead of switch statements
const RARITY_GRADIENTS: Record<string, string> = {
    'Common': 'from-slate-500 to-slate-600',
    'Uncommon': 'from-green-500 to-emerald-600',
    'Rare': 'from-blue-500 to-cyan-600',
    'Epic': 'from-purple-500 to-fuchsia-600',
    'Legendary': 'from-orange-500 to-amber-600',
    'Mythical': 'from-red-600 to-rose-700',
}

const RARITY_GLOWS: Record<string, string> = {
    'Common': 'drop-shadow-[0_0_15px_rgba(148,163,184,0.6)]',
    'Uncommon': 'drop-shadow-[0_0_20px_rgba(34,197,94,0.8)]',
    'Rare': 'drop-shadow-[0_0_25px_rgba(59,130,246,0.9)]',
    'Epic': 'drop-shadow-[0_0_30px_rgba(168,85,247,1)]',
    'Legendary': 'drop-shadow-[0_0_35px_rgba(251,146,60,1.2)]',
    'Mythical': 'drop-shadow-[0_0_40px_rgba(239,68,68,1.3)]',
}

interface GameCardProps {
    character: Cat | Dog
    isEnemy?: boolean
    onClick?: () => void
    selected?: boolean
    disabled?: boolean
    showStats?: boolean
    animate?: boolean
    holographicMode?: 'subtle' | 'full' | 'none'
}

export default React.memo(function GameCard({
    character,
    isEnemy = false,
    onClick,
    selected = false,
    disabled = false,
    showStats = true,
    animate = true,
    holographicMode = 'full'
}: GameCardProps) {

    const isCat = !isEnemy
    const rarity = (character as Cat).rarity || 'Common'

    // Holographic effect
    const holographic = useHolographicCard({
        mode: holographicMode === 'none' ? 'subtle' : holographicMode,
        maxRotation: holographicMode === 'full' ? 15 : 8,
        shineIntensity: rarity === 'Mythical' ? 0.8 : rarity === 'Legendary' ? 0.7 : 0.6,
        enableMobile: !disabled && animate && holographicMode !== 'none',
        enableWeb: !disabled && animate && holographicMode !== 'none'
    })

    const rarityGradient = RARITY_GRADIENTS[rarity] || RARITY_GRADIENTS['Common']
    const rarityGlow = RARITY_GLOWS[rarity] || RARITY_GLOWS['Common']

    // Determine if card should have special animations
    const hasSpecialGlow = rarity === 'Mythical' || rarity === 'Legendary'
    const rarityAnimationClass = rarity === 'Mythical' ? 'mythical-glow' : rarity === 'Legendary' ? 'legendary-glow' : ''

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
            {rarity === 'Mythical' && (
                <>
                    <div className="absolute top-4 left-4 w-2 h-2 bg-red-500 rounded-full mythical-particle" style={{ animationDelay: '0s' }} />
                    <div className="absolute top-8 right-6 w-2 h-2 bg-red-400 rounded-full mythical-particle" style={{ animationDelay: '0.5s' }} />
                    <div className="absolute bottom-12 left-8 w-2 h-2 bg-rose-500 rounded-full mythical-particle" style={{ animationDelay: '1s' }} />
                    <div className="absolute bottom-6 right-4 w-2 h-2 bg-red-600 rounded-full mythical-particle" style={{ animationDelay: '1.5s' }} />
                </>
            )}

            {/* Card Container with Rarity Glow */}
            <div className={`relative z-[3] isolate w-full h-full rounded-2xl overflow-hidden shadow-premium-lg ${rarityGlow} ${hasSpecialGlow ? rarityAnimationClass : ''}`}
                style={hasSpecialGlow ? { animation: `${rarityAnimationClass} 2s ease-in-out infinite`, willChange: 'transform, opacity' } : { willChange: 'transform' }}
            >

                {/* Full-Bleed Character Art - No Border */}
                <div className="absolute inset-0 rounded-2xl overflow-hidden" style={{ willChange: 'transform' }}>
                    {character.imageUrl ? (
                        <img
                            src={character.imageUrl}
                            alt={character.name}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 scale-150">
                            <Avatar seed={character.id} kind={isEnemy ? 'dog' : 'cat'} />
                        </div>
                    )}

                    {/* Minimal Gradient Overlays - only at top and bottom */}
                    <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/60 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
                </div>

                {/* Card Content Overlay */}
                <div className="relative z-10 h-full flex flex-col justify-between p-4">

                    {/* Top: Enhanced Name Badge */}
                    <div className="flex flex-col items-center gap-1">
                        <div className={`px-4 py-2 rounded-lg bg-gradient-to-br ${rarityGradient} shadow-lg border-2 border-white/40 backdrop-blur-sm`}>
                            <h3 className="font-black text-sm tracking-wider text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] uppercase">
                                {character.name}
                            </h3>
                        </div>
                        {isCat && (
                            <div className="px-3 py-1 rounded-md bg-black/70 backdrop-blur-md border border-white/20 shadow-md">
                                <span className="text-[9px] text-slate-200 uppercase tracking-widest font-bold">
                                    {(character as Cat).breed}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Bottom Section: Ability + Stats */}
                    <div className="flex flex-col gap-1">
                        {/* Enhanced Ability - Always render */}
                        <div className="px-2 py-1 bg-black rounded-lg border-2 border-gold-500 shadow-lg flex-shrink-0">
                            <div className="text-[9px] font-black text-gold-400 tracking-wider uppercase text-center leading-tight">
                                {character.ability?.name || 'ABILITY'}
                            </div>
                        </div>

                        {/* Vintage Stats */}
                        {showStats && (
                            <div className="flex justify-between items-center px-1 flex-shrink-0">
                                {/* Attack */}
                                <div className="flex flex-col items-center gap-0.5">
                                    <div className="w-9 h-9 bg-black rounded border-2 border-amber-500 flex items-center justify-center shadow-lg">
                                        <span className="font-black text-amber-400 text-base" style={{ textShadow: '0 0 4px rgba(0,0,0,1), 0 2px 4px rgba(0,0,0,1)' }}>{character.attack}</span>
                                    </div>
                                    <span className="text-[7px] text-amber-200 font-bold tracking-wide uppercase">ATK</span>
                                </div>

                                {/* Level */}
                                {(character as any).level !== undefined && (
                                    <div className="px-2 py-0.5 bg-black rounded border-2 border-slate-400 shadow-lg">
                                        <div className="flex flex-col items-center">
                                            <span className="text-[6px] text-slate-300 font-bold tracking-wide leading-none">LVL</span>
                                            <span className="text-base font-black text-white leading-none" style={{ textShadow: '0 0 4px rgba(0,0,0,1), 0 2px 4px rgba(0,0,0,1)' }}>{(character as any).level}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Health */}
                                <div className="flex flex-col items-center gap-0.5">
                                    <div className="w-11 h-9 bg-black rounded border-2 border-emerald-500 flex items-center justify-center shadow-lg px-1">
                                        <span className="font-black text-emerald-400 text-xs" style={{ textShadow: '0 0 4px rgba(0,0,0,1), 0 2px 4px rgba(0,0,0,1)' }}>
                                            {(character as any).currentHp !== undefined && (character as any).maxHp !== undefined
                                                ? `${(character as any).currentHp}/${(character as any).maxHp}`
                                                : (character as any).currentHp || character.health || 0}
                                        </span>
                                    </div>
                                    <span className="text-[7px] text-emerald-200 font-bold tracking-wide uppercase">HP</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    )
})
