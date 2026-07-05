// Jungle of Talons domain: the run state machine, squad selection, boons, medals,
// stats, pass entitlement, and the announcement/tab flags.
//
// Persisted fields for this domain are declared (and validated) in
// src/game/saveData.ts — this slice only owns their live values and mutations.

import type { StateCreator } from 'zustand'
import type { JungleRunState, JungleStats, JungleStageResult } from '../jungleRun'
import { createJungleRun, calculateScore, applyHealingSpring, applyStageStartHealing, applyBoonStatsToSquad } from '../jungleRun'
import { generateBoonOffering, applyBoon, calculateBoonEffects, createPRNG, generateSeed } from '../boons'
import { getNewlyUnlockedMedals } from '../jungleRewards'
import { isHealingSpring } from '../birds'
import { JUNGLE_SQUAD_SIZE } from '../constants'
import { uploadJungleLeaderboardStats } from '../../utils/jungleLeaderboard'
import type { OwnedCat } from './shared'
import { getJungleInitialState } from './shared'
import type { GameState } from './types'

export interface JungleSlice {
  junglePassUnlocked: boolean
  junglePassPending: boolean
  jungleRun: JungleRunState | null
  jungleStats: JungleStats
  unlockedJungleMedals: string[]
  jungleAnnouncementShown: boolean
  jungleTabVisited: boolean
  startJungleRun: ()=>void
  selectJungleSquad: (catInstanceIds: [string, string, string])=>boolean
  completeJungleStage: (result: JungleStageResult)=>void
  selectJungleBoon: (boonId: string)=>void
  advanceJungleStage: ()=>void
  startJungleBattle: ()=>void
  abandonJungleRun: ()=>void
  finishJungleRun: ()=>void
  unlockJunglePass: ()=>void
  setJunglePassPending: (pending: boolean)=>void
  dismissJungleAnnouncement: ()=>void
  markJungleTabVisited: ()=>void
}

export const createJungleSlice: StateCreator<GameState, [], [], JungleSlice> = (set, get) => ({
  ...getJungleInitialState(),

  startJungleRun: ()=> {
    const s = get()
    if (!s.junglePassUnlocked) return
    if (s.jungleRun && s.jungleRun.phase !== 'idle') return
    set({ jungleRun: {
      runId: '', seed: 0, phase: 'squad_select' as const,
      currentStage: 0, squad: [], activeBoons: [],
      stageResults: [], currentBoonOffering: null,
      consecutiveAllCommonOfferings: 0, prngCallCount: 0,
      bossRevived: {}, startedAt: 0,
    } as JungleRunState })
  },

  selectJungleSquad: (catInstanceIds)=> {
    const s = get()
    if (!s.junglePassUnlocked) return false

    // Validate cats exist, are alive, and we have exactly 3
    const cats = catInstanceIds.map(id => s.owned.find(c => c.instanceId === id)).filter(Boolean) as OwnedCat[]
    if (cats.length !== JUNGLE_SQUAD_SIZE) return false
    if (cats.some(c => c.currentHp <= 0)) return false

    const seed = generateSeed(catInstanceIds.join('-') + Date.now())
    const run = createJungleRun(cats, seed)

    set({
      jungleRun: run,
      jungleStats: { ...s.jungleStats, totalRuns: s.jungleStats.totalRuns + 1 },
    })
    get().save()
    return true
  },

  completeJungleStage: (result)=> {
    set(s => {
      if (!s.jungleRun) return s
      const run = s.jungleRun

      const newResults = [...run.stageResults, result]

      // Update squad HP from result
      const updatedSquad = run.squad.map(cat => {
        const hp = result.catHpRemaining[cat.instanceId]
        if (hp !== undefined) {
          return {
            ...cat,
            currentHp: Math.max(0, hp),
            knockedOut: hp <= 0 ? true : cat.knockedOut,
          }
        }
        return cat
      })

      // Check if all cats are knocked out
      const allDead = updatedSquad.every(c => c.knockedOut)
      if (allDead) {
        return {
          jungleRun: {
            ...run,
            phase: 'run_failed' as const,
            squad: updatedSquad,
            stageResults: newResults,
          },
        }
      }

      // Stage 20 completed = run complete
      if (run.currentStage >= 20) {
        return {
          jungleRun: {
            ...run,
            phase: 'run_complete' as const,
            squad: updatedSquad,
            stageResults: newResults,
          },
        }
      }

      // Generate boon offering
      const prng = createPRNG(run.seed)
      // Advance PRNG to correct position
      for (let i = 0; i < run.prngCallCount; i++) prng()

      let callCount = run.prngCallCount
      const fortuneStacks = run.activeBoons.find(b => b.boonId === 'fortune-favor')?.stacks ?? 0
      const offering = generateBoonOffering(
        () => { callCount++; return prng() },
        run.activeBoons,
        run.consecutiveAllCommonOfferings,
        fortuneStacks,
      )

      return {
        jungleRun: {
          ...run,
          phase: 'boon_select' as const,
          squad: updatedSquad,
          stageResults: newResults,
          currentBoonOffering: offering,
          prngCallCount: callCount,
        },
      }
    })
    get().save()
  },

  selectJungleBoon: (boonId)=> {
    set(s => {
      if (!s.jungleRun || s.jungleRun.phase !== 'boon_select') return s
      const run = s.jungleRun

      const newActiveBoons = applyBoon(run.activeBoons, boonId)
      const boonEffects = calculateBoonEffects(newActiveBoons)
      const updatedSquad = applyBoonStatsToSquad(run.squad, boonEffects)

      // Track pity timer
      const allCommon = run.currentBoonOffering?.boons.every(b => b.rarity === 'Common') ?? false
      const newPityCount = allCommon ? run.consecutiveAllCommonOfferings + 1 : 0

      return {
        jungleRun: {
          ...run,
          phase: 'stage_cleared' as const,
          activeBoons: newActiveBoons,
          squad: updatedSquad,
          currentBoonOffering: null,
          consecutiveAllCommonOfferings: newPityCount,
        },
      }
    })
    get().save()
  },

  advanceJungleStage: ()=> {
    set(s => {
      if (!s.jungleRun) return s
      const run = s.jungleRun

      // Safety check: if all cats are KO'd, end the run
      if (run.squad.every(c => c.knockedOut)) {
        return {
          jungleRun: {
            ...run,
            phase: 'run_failed' as const,
          },
        }
      }

      // From healing_spring: stage already incremented, just move to pre_battle
      if (run.phase === 'healing_spring') {
        return {
          jungleRun: {
            ...run,
            phase: 'pre_battle' as const,
          },
        }
      }

      if (run.phase !== 'stage_cleared') return s
      const nextStage = run.currentStage + 1

      // Apply Rally Cry healing at stage start
      const boonEffects = calculateBoonEffects(run.activeBoons)
      let updatedSquad = applyStageStartHealing(run.squad, boonEffects.stageStartHeal)

      // Check for Healing Springs
      if (isHealingSpring(run.currentStage)) {
        updatedSquad = applyHealingSpring(updatedSquad)
        return {
          jungleRun: {
            ...run,
            phase: 'healing_spring' as const,
            currentStage: nextStage,
            squad: updatedSquad,
          },
        }
      }

      return {
        jungleRun: {
          ...run,
          phase: 'pre_battle' as const,
          currentStage: nextStage,
          squad: updatedSquad,
        },
      }
    })
    get().save()
  },

  startJungleBattle: ()=> {
    set(s => {
      if (!s.jungleRun || s.jungleRun.phase !== 'pre_battle') return s
      return { jungleRun: { ...s.jungleRun, phase: 'in_battle' as const } }
    })
  },

  abandonJungleRun: ()=> {
    set(s => {
      if (!s.jungleRun) return s
      // Transition to run_failed so the defeat recap modal shows
      return {
        jungleRun: {
          ...s.jungleRun,
          phase: 'run_failed' as const,
        },
      }
    })
    get().save()
  },

  finishJungleRun: ()=> {
    set(s => {
      if (!s.jungleRun) return s
      const run = s.jungleRun
      const score = calculateScore(run)
      const runDuration = Date.now() - run.startedAt
      const isComplete = run.phase === 'run_complete'

      // Derive boss kills and flawless count from this run
      const runBossStages = run.stageResults.map(r => r.stageNumber).filter(n => n === 10 || n === 20)
      const runFlawlessCount = run.stageResults.filter(r => r.wasFlawless).length

      const newStats: JungleStats = {
        ...s.jungleStats,
        totalRunsCompleted: isComplete ? s.jungleStats.totalRunsCompleted + 1 : s.jungleStats.totalRunsCompleted,
        bestScore: Math.max(s.jungleStats.bestScore, score.totalScore),
        bestStage: Math.max(s.jungleStats.bestStage, run.currentStage),
        totalCoinsEarned: s.jungleStats.totalCoinsEarned + score.coinsEarned,
        fastestCompletionMs: isComplete
          ? (s.jungleStats.fastestCompletionMs === null
            ? runDuration
            : Math.min(s.jungleStats.fastestCompletionMs, runDuration))
          : s.jungleStats.fastestCompletionMs,
        bossesDefeated: [...new Set([...(s.jungleStats.bossesDefeated ?? []), ...runBossStages])],
        maxFlawlessStages: Math.max(s.jungleStats.maxFlawlessStages ?? 0, runFlawlessCount),
      }

      // Check for newly unlocked medals
      const newMedals = getNewlyUnlockedMedals(run, s.jungleStats, score.totalScore, s.unlockedJungleMedals)

      return {
        jungleRun: null,
        jungleStats: newStats,
        coins: s.coins + score.coinsEarned,
        unlockedJungleMedals: [...s.unlockedJungleMedals, ...newMedals.map(m => m.id)],
      }
    })
    get().save()

    // Upload to jungle leaderboard
    const state = get()
    const profile = state.getCurrentProfile()
    if (profile?.cloudCode) {
      uploadJungleLeaderboardStats(profile.cloudCode, profile.name, {
        bestScore: state.jungleStats.bestScore,
        highestStage: state.jungleStats.bestStage,
        totalClears: state.jungleStats.totalRunsCompleted,
        fastestClearMs: state.jungleStats.fastestCompletionMs,
      })
    }
  },

  unlockJunglePass: ()=> {
    set({ junglePassUnlocked: true, junglePassPending: false })
    get().save()
  },

  setJunglePassPending: (pending)=> set({ junglePassPending: pending }),

  dismissJungleAnnouncement: ()=> {
    set({ jungleAnnouncementShown: true })
    get().save()
  },

  markJungleTabVisited: ()=> {
    set({ jungleTabVisited: true })
    get().save()
  },
})
