// Google Analytics 4 custom event tracking for Whisker Wars

declare global {
  interface Window {
    gtag: (
      command: 'event' | 'config' | 'set',
      eventNameOrConfig: string,
      params?: Record<string, unknown>
    ) => void
  }
}

/**
 * Safe wrapper - silently no-ops if gtag is not loaded.
 * Analytics must never crash the game.
 */
function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean | undefined>
): void {
  try {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', eventName, params)
    }
  } catch {
    // Silently swallow
  }
}

// ── Virtual Page Views (hash-based routing) ──

export function trackPageView(viewName: string): void {
  trackEvent('page_view', {
    page_title: `Whisker Wars - ${viewName}`,
    page_location: window.location.href,
    page_path: `/${viewName}`,
  })
}

// ── Navigation ──

export function trackTabNavigation(tabName: string): void {
  trackEvent('tab_navigation', { tab_name: tabName })
}

export function trackAchievementsModalOpened(): void {
  trackEvent('achievements_modal_opened')
}

// ── Bait System ──

export function trackBaitPurchased(baitName: string, baitTier: number, cost: number): void {
  trackEvent('bait_purchased', {
    bait_name: baitName,
    bait_tier: baitTier,
    coins_spent: cost,
  })
}

export function trackBaitUsed(baitName: string, baitTier: number): void {
  trackEvent('bait_used', {
    bait_name: baitName,
    bait_tier: baitTier,
  })
}

export function trackCatchSuccess(catName: string, catRarity: string, baitName: string, baitTier: number): void {
  trackEvent('catch_success', {
    cat_name: catName,
    cat_rarity: catRarity,
    bait_name: baitName,
    bait_tier: baitTier,
  })
}

export function trackCatchFailure(baitName: string, baitTier: number): void {
  trackEvent('catch_failure', {
    bait_name: baitName,
    bait_tier: baitTier,
  })
}

// ── Battle System ──

export function trackBattleStart(partySize: number, partyNames: string, dogName: string, difficultyLevel: number): void {
  trackEvent('battle_start', {
    party_size: partySize,
    party_names: partyNames,
    dog_name: dogName,
    difficulty_level: difficultyLevel,
  })
}

export function trackAbilityTriggered(catName: string, abilityName: string, abilityEffect: string, context: 'battle' | 'training'): void {
  trackEvent('ability_triggered', {
    cat_name: catName,
    ability_name: abilityName,
    ability_effect: abilityEffect,
    context: context,
  })
}

export function trackBattleWon(dogName: string, coinsEarned: number, xpEarned: number, difficultyLevel: number): void {
  trackEvent('battle_won', {
    dog_name: dogName,
    coins_earned: coinsEarned,
    xp_earned: xpEarned,
    difficulty_level: difficultyLevel,
  })
}

export function trackBattleLost(dogName: string, difficultyLevel: number): void {
  trackEvent('battle_lost', {
    dog_name: dogName,
    difficulty_level: difficultyLevel,
  })
}

export function trackDogDefeated(dogName: string, dogIndex: number, difficultyLevel: number): void {
  trackEvent('dog_defeated', {
    dog_name: dogName,
    dog_index: dogIndex,
    difficulty_level: difficultyLevel,
  })
}

// ── Training System ──

export function trackTrainingStart(catName: string, catLevel: number): void {
  trackEvent('training_start', {
    cat_name: catName,
    cat_level: catLevel,
  })
}

export function trackTrainingComplete(catName: string, xpGained: number): void {
  trackEvent('training_complete', {
    cat_name: catName,
    xp_gained: xpGained,
  })
}

// ── Collection ──

export function trackCardZoomed(catName: string, catRarity: string, catLevel: number): void {
  trackEvent('card_zoomed', {
    cat_name: catName,
    cat_rarity: catRarity,
    cat_level: catLevel,
  })
}

export function trackCatReleased(catName: string, catRarity: string, catLevel: number): void {
  trackEvent('cat_released', {
    cat_name: catName,
    cat_rarity: catRarity,
    cat_level: catLevel,
  })
}

export function trackMergeAttempted(catName: string, currentTier: number): void {
  trackEvent('merge_attempted', {
    cat_name: catName,
    current_tier: currentTier,
  })
}

export function trackMergeSuccess(catName: string, newTier: number, isPrismatic: boolean): void {
  trackEvent('merge_success', {
    cat_name: catName,
    new_tier: newTier,
    is_prismatic: isPrismatic,
  })
}

export function trackHealAll(cost: number, catsHealed: number): void {
  trackEvent('heal_all_cats', {
    coins_spent: cost,
    cats_healed: catsHealed,
  })
}

export function trackSortUsed(sortBy: string): void {
  trackEvent('collection_sort', { sort_by: sortBy })
}

export function trackFilterUsed(filterBy: string): void {
  trackEvent('collection_filter', { filter_by: filterBy })
}

// ── Progression ──

export function trackLevelUp(catName: string, newLevel: number, catRarity: string): void {
  trackEvent('cat_level_up', {
    cat_name: catName,
    new_level: newLevel,
    cat_rarity: catRarity,
  })
}

export function trackAchievementUnlocked(achievementId: string, achievementName: string): void {
  trackEvent('achievement_unlocked', {
    achievement_id: achievementId,
    achievement_name: achievementName,
  })
}

export function trackAchievementClaimed(achievementId: string, achievementName: string, coinsEarned: number): void {
  trackEvent('achievement_claimed', {
    achievement_id: achievementId,
    achievement_name: achievementName,
    coins_earned: coinsEarned,
  })
}

export function trackDailyRewardClaimed(coinsEarned: number): void {
  trackEvent('daily_reward_claimed', { coins_earned: coinsEarned })
}

// ── Economy ──

export function trackCoinsEarned(source: string, amount: number): void {
  trackEvent('coins_earned', { source, amount })
}

export function trackCoinsSpent(purpose: string, amount: number): void {
  trackEvent('coins_spent', { purpose, amount })
}

// ── Profile & Session ──

export function trackProfileCreated(profileId: string): void {
  trackEvent('profile_created', { profile_id: profileId })
}

export function trackProfileSwitched(profileId: string): void {
  trackEvent('profile_switched', { profile_id: profileId })
}

export function trackTutorialCompleted(): void {
  trackEvent('tutorial_completed')
}

export function trackTutorialSkipped(slideReached: number): void {
  trackEvent('tutorial_skipped', { slide_reached: slideReached })
}

// ── Jungle of Talons ──

export function trackJungleRunStart(squadSize: number): void {
  trackEvent('jungle_run_start', { squad_size: squadSize })
}

export function trackJungleStageComplete(stage: number, birdName: string): void {
  trackEvent('jungle_stage_complete', { stage, bird_name: birdName })
}

export function trackJungleBoonSelected(boonName: string, boonRarity: string): void {
  trackEvent('jungle_boon_selected', { boon_name: boonName, boon_rarity: boonRarity })
}

export function trackJungleBossDefeated(bossName: string, stage: number): void {
  trackEvent('jungle_boss_defeated', { boss_name: bossName, stage })
}

export function trackJungleRunComplete(score: number, stagesCleared: number): void {
  trackEvent('jungle_run_complete', { score, stages_cleared: stagesCleared })
}

export function trackJungleRunFailed(stage: number, score: number): void {
  trackEvent('jungle_run_failed', { stage, score })
}

export function trackJunglePurchaseStart(): void {
  trackEvent('jungle_purchase_start')
  // GA4 recommended event — appears as Lead in reports
  trackEvent('generate_lead', {
    currency: 'ZAR',
    value: 120,
  })
}

export function trackJunglePurchaseComplete(transactionId: string): void {
  trackEvent('jungle_purchase_complete', { transaction_id: transactionId })
  // GA4 recommended ecommerce event — appears as Sale with R120 revenue
  try {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', 'purchase', {
        transaction_id: transactionId,
        value: 120,
        currency: 'ZAR',
        items: [{ item_id: 'jungle-pass', item_name: 'Jungle of Talons Expansion', price: 120, quantity: 1 }],
      })
    }
  } catch { /* silently swallow */ }
}

export function trackJunglePurchaseFailed(reason: string): void {
  trackEvent('jungle_purchase_failed', { reason })
}
