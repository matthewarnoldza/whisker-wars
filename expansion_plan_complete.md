# Star Paws: Jungle Run — Complete Expansion Blueprint

> **Status:** Production-ready design specification
> **Companion documents:** [`star-paws-jungle-run-ui-spec.md`](star-paws-jungle-run-ui-spec.md) (2,400-line UI/UX spec with Tailwind classes, Framer-Motion configs, and component layouts)
> **Price:** R120 ZAR (~$6.50 USD) | **Platform:** Web only | **Payment:** Peach Payments

---

## Executive Summary

This document is the definitive build blueprint for Star Paws: Jungle Run. It synthesizes four deep-dive analyses:

1. **UI/UX** — Every screen, modal, animation, and micro-interaction
2. **Gameplay Balance** — Bird stats, survival math, boon balance, boss design
3. **Level Design** — Stage-by-stage breakdown, narrative, save states, pacing
4. **Technical Integration** — Peach Payments, Firebase functions, state management, security

A developer can build and ship this expansion without asking a single clarifying question.

---

## Table of Contents

1. [Game Mode Overview](#1-game-mode-overview)
2. [Player Discovery & Purchase](#2-player-discovery--purchase)
3. [Navigation & Theme](#3-navigation--theme)
4. [Bird Enemies — Complete Stat Tables](#4-bird-enemies)
5. [Stage-by-Stage Design (All 20)](#5-stage-by-stage-design)
6. [Boss Encounters](#6-boss-encounters)
7. [Boon System — Complete Balance](#7-boon-system)
8. [Health Management & Survival Math](#8-health-management--survival-math)
9. [Scoring & Leaderboard](#9-scoring--leaderboard)
10. [Save State & Run Persistence](#10-save-state--run-persistence)
11. [Replayability & Rewards](#11-replayability--rewards)
12. [Peach Payments Integration](#12-peach-payments-integration)
13. [Firebase Cloud Functions](#13-firebase-cloud-functions)
14. [State Management (Zustand)](#14-state-management)
15. [New Files & Modified Files](#15-file-map)
16. [Testing Strategy](#16-testing-strategy)
17. [Rollout Plan](#17-rollout-plan)
18. [Narrative & World-Building](#18-narrative)

---

## 1. Game Mode Overview

### Core Loop

```
Select 3 cats from collection
  → Enter Stage 1 (Canopy Trail)
    → Battle 1 bird enemy (same turn-based D20 combat)
    → Victory → Choose 1 of 3 random Boons
    → HP carries over (no free healing)
    → Next stage (harder bird, new abilities)
  → Boss at Stage 10 (Apex Raptor) & Stage 20 (The Feathered King)
  → Run ends when all 3 cats KO'd OR Stage 20 cleared
  → Score calculated → Leaderboard → Rewards
```

### Key Design Principles

| Principle | Detail |
|-----------|--------|
| **1 bird per stage** | Matches existing 3v1 combat in BattleArena.tsx. No multi-enemy rework needed. |
| **Not pay-to-win** | Expansion rewards are cosmetic only. No stat advantages in the base game. |
| **Reuses everything** | Same battle system, same UI patterns, same state management. New content, not new architecture. |
| **Elemental Stones DISABLED** | Voidstone/Emberstone trivialize roguelike HP tension. Stones stay equipped but inactive. |
| **Target session** | 15–25 minutes for a full clear. Save system supports pause/resume across sessions. |
| **Target clear rate** | 10–15% of endgame runs clear Stage 20. 2–4% clear with all cats alive. |

### Entry Requirements

**Hard gate:** Defeated Dog Index ≥ 10 (Crystal Guardian) + at least 3 cats owned + at least 1 cat at Level 5+.

**Soft gate (first-run warning):** "We recommend 3 cats at Level 8+, at least 1 Rare or higher, and equipment on all cats."

---

## 2. Player Discovery & Purchase

> Full component specs, Tailwind classes, and Framer-Motion animations in [`star-paws-jungle-run-ui-spec.md`](star-paws-jungle-run-ui-spec.md)

### Three-Layer Discovery System

1. **EventBanner promo** — Emerald gradient banner above existing event banners. Session-scoped dismissal (reappears next session). "Preview" button → jungle tab.
2. **One-time Announcement Modal** — Full-screen hero art + feature list on first app open post-update. Spring-animated, staggered feature list. "Explore Now" / "Maybe Later".
3. **Persistent Locked Tab** — Jungle tab always visible in nav with lock icon + subtle emerald pulse. Serves as permanent reminder.

### Purchase Flow (5 States)

| State | What Player Sees |
|-------|-----------------|
| **Preview** | Full marketing page: hero art, 6 feature cards, blurred bird preview strip, R120 CTA, payment method badges |
| **Loading** | Spinner + "Preparing secure checkout..." while Cloud Function creates Peach session |
| **Checkout** | Peach Embedded SDK renders inside modal (Visa, MC, SnapScan, Ozow, PayJustNow) |
| **Confirming** | Spinner + "Payment received! Confirming unlock..." (polls Firebase for webhook confirmation, max 30s) |
| **Success** | ParticleSystem burst, crown drop animation, staggered "UNLOCKED!" celebration, "Enter the Jungle" CTA |

**Failure/cancellation:** Returns to preview state. "Payment could not be processed" with retry button.

**Already purchased (cloud restore):** `junglePassUnlocked: true` syncs from Firebase → tab unlocks automatically.

**No cloud code:** "You need a cloud save code first" — blocks checkout until generated.

---

## 3. Navigation & Theme

### Tab Placement

Jungle tab inserted between "Train" and "Stats". Always visible. Lock icon + emerald pulse when not purchased. Standard emerald gradient when active and unlocked.

### Jungle Theme (Conditional)

The theme applies ONLY when `view === 'jungle'`. Not a global replacement.

**Color palette:** Deep jungle blacks/greens (`#022c22` base), emerald-400 accents, teal-300 highlights, gold for scores/coins.

**Animated background (7 layers):**
1. Dark sky gradient with sparse twinkling stars
2. Far canopy silhouettes (60s parallax drift)
3. Mid canopy with swaying vine SVGs (45s drift)
4. Floating emerald mist circles (20s bob)
5. Firefly particles (8 emerald dots, gentle bob)
6. Foreground vine edges (opacity 0.08, 8s sway)
7. Radial vignette

**Page transition:** Desaturation-to-saturation effect when entering jungle view (`brightness(0.5) saturate(0.5)` → normal over 0.5s).

### Mid-Run Navigation

Players CAN switch to other tabs during a run. Toast notification: "Jungle run paused. Return to the Jungle tab to continue." Run state preserved. Only the explicit "Abandon Run" button ends a run.

---

## 4. Bird Enemies

### Complete Roster (11 Birds)

| # | Bird | Tier | Base HP | Base ATK | DEF | Speed | Stages | Ability |
|---|------|------|---------|----------|-----|-------|--------|---------|
| 1 | Jungle Sparrow | 1 | 35 | 5 | 0 | 8 | 1–4 | **Quick Peck:** 30% chance to attack twice per turn |
| 2 | Canopy Parrot | 1 | 40 | 4 | 0 | 6 | 1–5 | **Mimicry:** 50% chance to copy last cat ability used |
| 3 | Vine Weaver | 2 | 55 | 6 | 1 | 5 | 3–8 | **Entangle:** 40% chance, -25% ATK to highest-ATK cat for 2 turns (no damage that turn) |
| 4 | Toucan Bruiser | 2 | 70 | 8 | 2 | 4 | 5–10 | **Beak Slam:** 35% chance, 1.5x single-target damage |
| 5 | Storm Hawk | 3 | 65 | 7 | 1 | 9 | 7–14 | **Dive Bomb:** 40% chance, floor(ATK×0.6) AoE to all 3 cats (3-turn cooldown) |
| 6 | Shadow Owl | 3 | 75 | 7 | 2 | 7 | 8–14 | **Night Vision:** Passive — ignores Shield and Armor abilities on target cat |
| 7 | Thornback Heron | 4 | 90 | 8 | 3 | 5 | 10–16 | **Reflect Thorns:** Passive — returns 25% of incoming damage to attacker |
| 8 | Ember Phoenix | 4 | 80 | 9 | 1 | 6 | 12–18 | **Rebirth:** One-time revive at 40% max HP when killed |
| 9 | Jungle Wyvern | 5 | 100 | 10 | 2 | 7 | 15–20 | **Poison Breath:** 50% chance, 3 dmg/turn for 3 turns (4-turn cooldown) |
| 10 | **Apex Raptor** | Boss | 250 | 14 | 3 | 8 | Stage 10 | 4-turn ability rotation (see Boss section) |
| 11 | **The Feathered King** | Boss | 500 | 18 | 4 | 6 | Stage 20 | 3-phase boss (see Boss section) |

### Stage Scaling Formula

```
stageMultiplier = 1.0 + (stage - 1) × 0.065
scaledHP  = floor(baseHP × stageMultiplier)
scaledATK = floor(baseATK × stageMultiplier)
DEF does NOT scale (keeps cat damage relevant at all stages)
```

Produces x2.235 at Stage 20. A Jungle Wyvern at Stage 19 has 217 HP and 21 ATK.

---

## 5. Stage-by-Stage Design

### Tier Structure

| Tier | Stages | Name | Theme | Palette |
|------|--------|------|-------|---------|
| 1 | 1–4 | **Canopy Trail** | Sunlit canopy, vines, parrots | Bright greens, golden sunlight |
| 2 | 5–8 | **River Crossing** | Misty river, rapids, log bridges | Deep teal, muddy brown |
| 3 | 9–12 | **Feathered Ruins** | Ancient bird civilization ruins | Mossy stone, faded gold |
| 4 | 13–16 | **Thornveil Deep** | Bioluminescent thorns, no sky | Dark purple, poisonous magenta |
| 5 | 17–20 | **The Apex Nest** | Massive nest, storms, throne | Crimson, gold, storm-black |

### All 20 Stages

| Stage | Name | Birds | New Mechanic | Difficulty | Est. HP Loss (Endgame) |
|-------|------|-------|-------------|-----------|----------------------|
| 1 | Sunlit Threshold | 1× Sparrow Scout | Tutorial overlay ("HP carries over") | 1/10 | 6 |
| 2 | Vine Walk | 1× Jay Striker | Dive Bomb (first ability) | 2/10 | 7 |
| 3 | Whispering Branches | 1× Crow Sentinel | Dodge (Dark Feather) | 2/10 | 9 |
| 4 | Canopy Ambush | 1× Pelican Brute | AoE (Gullet Slam) | 3/10 | 10 |
| 5 | Misty Riverbank | 1× Hawk Predator | Bleed DOT (Talon Rend) | 4/10 | 14 |
| 6 | Log Bridge | 1× Parrot Mimic | Copycat ability | 4/10 | 15 |
| 7 | Waterfall Grotto | 1× Owl Sage | Enemy healing (Wisdom Ward) | 5/10 | 17 |
| 8 | Rapids Gauntlet | 1× Flamingo Dancer | Silence (Dazzle) | 5/10 | 19 |
| 9 | Overgrown Gates | 1× Condor Warden | Armor + ATK debuff combo | 6/10 | 20 |
| **10** | **Raptor's Throne** | **Apex Raptor** | **Multi-phase boss** | **7/10** | **80** |
| 11 | Shattered Aviary | 1× Eagle Champion | Assassin targeting (lowest HP) | 6/10 | 22 |
| 12 | Idol Chamber | 1× Owl Sage + synergy | Full synergy encounter | 7/10 | 35 |
| 13 | Thornveil Entrance | 1× Cassowary Berserker | Rage scaling (+2 ATK per hit taken) | 7/10 | 28 |
| 14 | Spore Cavern | 1× Harpy Witch | Anti-healing curse + Phoenix revive | 8/10 | 38 |
| **Healing Spring** | *After Stage 14* | — | *Heals all cats 15% max HP* | — | *-67* |
| 15 | Thorn Maze | 1× Jungle Wyvern | Poison DOT | 8/10 | 50 |
| 16 | Fungal Heart | 1× Roc Titan | Crowd control (Wingbeat Gale) | 8/10 | 45 |
| 17 | Bone Bridge | 1× Wyvern (gauntlet) | Pure attrition | 9/10 | 52 |
| 18 | Featherstorm Gallery | 1× Roc Titan + anti-sustain | Anti-heal gauntlet | 9/10 | 53 |
| 19 | Throne Approach | 1× (largest encounter) | Final gauntlet, 4 enemy types | 10/10 | 54 |
| **20** | **The Feathered King's Court** | **The Feathered King** | **3-phase final boss** | **10/10** | **350** |

**Healing Springs** appear at fixed stages (after 7 and after 14), healing all cats 15% max HP. Not random — players can plan around them.

---

## 6. Boss Encounters

### Stage 10: Apex Raptor

**Stats (after x1.585 scaling):** 396 HP, 22 ATK, 3 DEF

**4-Turn Ability Rotation:**

| Turn | Ability | Effect |
|------|---------|--------|
| 1 | Talon Sweep | AoE: 11 damage to each cat (33 total) |
| 2 | Focused Strike | 1.5x single-target: ~34 damage |
| 3 | Wing Gust | -15% ATK to all cats for 2 turns (no damage) |
| 4 | Normal Attack | ~23 to one cat |

**Expected damage:** ~80 HP across 3–4 rounds for endgame squad.

**Reward:** Guaranteed bonus boon "Raptor's Feather" (+3 ATK to all cats for rest of run) IN ADDITION to normal 3-boon selection.

### Stage 20: The Feathered King

**Stats (after x2.235 scaling):** 1117 HP, 40 ATK, 4 DEF

**Phase 1 — The Sovereign (100%–50% HP, 558 HP to deplete)**

| Turn | Ability | Effect |
|------|---------|--------|
| 1 | Royal Decree | AoE: 16 damage to each cat (48 total) |
| 2 | Regal Strike | Normal: ~41 to one cat |
| 3 | Feather Storm | Silences ALL cat abilities for 1 turn |
| 4 | Normal Attack | ~41 to random cat |

Phase 1 damage: ~150 HP. King fights from throne, regal and controlled.

**Phase 2 — The Tempest (50%–25% HP, ATK → 50)**

| Turn | Ability | Effect |
|------|---------|--------|
| 1 | Hurricane Wings | AoE: 25 each cat (75 total) |
| 2 | Beak of Ruin | Targets HIGHEST HP cat, 2x damage: ~101 |
| 3 | Molting Shield | Heals 55 HP + gains +2 DEF for 2 turns |
| 4 | Talon Barrage | 3 random attacks at 20 damage each |

Phase 2 damage: ~200 HP. King airborne, storm effects, environment cracking.

**Phase 3 — The Dying God (25%–0% HP, ATK → 60)**

| Turn | Ability | Effect |
|------|---------|--------|
| 1 | Extinction Cry | AoE: 36 each (108 total) + poison all cats (2/turn, 2 turns) |
| 2 | Death Dive | Targets LOWEST HP cat, 2.5x damage: 150 |
| 3 | Feathered Fury | Two full-ATK attacks on random targets: ~122 total |

Phase 3 damage: ~270 HP. King grounded, burning, desperate. Death Dive nearly guarantees one cat KO.

**Total boss damage across all phases: ~620 HP.** Beatable by endgame squads entering at ~400+ HP with good boons and Second Wind.

**Victory sequence:** King collapses, crown cracks, dissolves into golden feathers in a shaft of sunlight. *"...well fought, little ones."*

---

## 7. Boon System

After each stage (except Stage 20), player picks 1 of 3 randomly offered boons. Boons stack and last the entire run.

### Complete Boon Table

| # | Boon | Category | Rarity | Weight | Stack | Max | Effect | Power Rank |
|---|------|----------|--------|--------|-------|-----|--------|-----------|
| 1 | Predator's Edge | Offensive | Common | 20 | Yes | 3 | +10% ATK per stack | B |
| 2 | Critical Claws | Offensive | Common | 18 | Yes | 2 | Crit threshold -2 per stack + flat +2 crit damage | B |
| 3 | Feral Frenzy | Offensive | Rare | 10 | No | 1 | 25% chance for extra attack per cat per turn | A |
| 4 | Venom Tips | Offensive | Rare | 10 | No | 1 | Attacks apply 2 dmg/turn poison for 2 turns | C |
| 5 | Thick Fur | Defensive | Common | 20 | Yes | 3 | -2 flat damage per hit per stack (min 1) | A |
| 6 | **Jungle Resilience** | **Defensive** | **Rare** | **12** | **Yes** | **3** | **Heal 5% max HP per cat after each stage** | **S** |
| 7 | Evasive Instinct | Defensive | Common | 16 | Yes | 2 | +10% dodge chance per stack | B |
| 8 | **Second Wind** | **Defensive** | **Legendary** | **4** | **No** | **1** | **Revive KO'd cat once at 25% max HP** | **S** |
| 9 | Swift Paws | Utility | Common | 18 | No | 1 | Always act first + Speed threshold -2 | C |
| 10 | Scavenger | Utility | Common | 16 | Yes | 3 | +20% coin bonus per stack (no survival value) | C |
| 11 | Lucky Find | Utility | Rare | 8 | No | 1 | +15% Rare weight, +5% Legendary weight in future offerings | C |
| 12 | Combo Master | Utility | Rare | 8 | No | 1 | All ability effects +25% (heal, lifesteal, crit mult, etc.) | A |

**Drop rates per 3-boon offering:** ~67.5% Common, ~30% Rare, ~2.5% Legendary.
**Probability of seeing Second Wind in a full 19-stage run:** 76.2%.
**Pity timer:** After 3 consecutive all-Common offerings, next offering guarantees at least 1 Rare+.

### Best Synergies

1. **Jungle Resilience + Thick Fur** ("Immortal Tank") — Heal 5–15% per stage AND reduce each hit by 2–6. Offsets ~70% of all incoming damage.
2. **Combo Master + Lifesteal cat (Reaper)** — Lifesteal goes from 75% → 93.75%. Self-sustaining DPS machine.
3. **Feral Frenzy + Critical Claws** ("Glass Cannon") — 25% more attacks with lower crit thresholds. Melts birds before they can deal damage.

---

## 8. Health Management & Survival Math

### HP Budget Analysis (Endgame Squad)

**Squad:** 3 Mythical cats, Level 10, Ascension 3, Elite Tier 2, Legendary equipment. ~190 HP each, ~560 total.

| Source | HP Impact | Notes |
|--------|-----------|-------|
| Total incoming damage (20 stages) | **-916 HP** | See stage table above |
| Cat ability recovery (heal, lifesteal) | **+480 HP** | Passive across 20 stages |
| Healing Springs (×2, after stages 7 & 14) | **+134 HP** | 15% max HP each, guaranteed |
| Jungle Resilience ×1 (if taken at stage 4) | **+450 HP** | 5% × 190 HP × 3 cats × 15 stages |
| Thick Fur ×2 (if taken) | **+160 HP** | -4 damage per hit × ~40 bird attacks |
| Second Wind (if available) | **+48 HP** | Revives one cat at 25% max HP |

**Without boons:** Squad dies at Stage 16–17.
**With good boons:** Stage 20 reachable. 10–15% clear rate.
**With perfect boons:** 30–50% clear rate for that specific run.

### Survival Rates by Squad

| Stage | All-Common | Mixed (Rare/Epic) | Endgame (Max Mythical) | Endgame + Good Boons |
|-------|-----------|-------------------|----------------------|---------------------|
| 5 | 70% | 95% | 100% | 100% |
| 10 (Boss) | <1% | 30% | 90% | 95% |
| 15 | 0% | 2% | 45% | 70% |
| 20 (Boss) | 0% | 0% | 5% | 15% |

### Knockout Rules

- Cat at 0 HP = **knocked out for the rest of the run**. No between-stage revive.
- Run continues with 2 (or 1) cats until all 3 are KO'd.
- Second Wind boon: auto-triggers once, revives at 25% max HP.
- Heal abilities work **in-battle only**, not between stages.

---

## 9. Scoring & Leaderboard

### Score Formula

| Component | Formula | Max |
|-----------|---------|-----|
| Stages Cleared | stages × 100 | 2000 |
| Speed Bonus | max(0, 1200 - seconds) × 2 | ~1200 |
| HP Remaining | totalRemainingHP × 3 | ~600 |
| Boss Kills | Raptor: 500, King: 1500 | 2000 |
| All Cats Alive | +1000 if all 3 alive | 1000 |
| Boon Efficiency | max(0, 15 - boonsUsed) × 50 | 750 |
| Flawless Stages | stages with 0 damage × 25 | 500 |

**Realistic maximum:** ~6,325 points (near-perfect run).
**Good run median:** ~4,600 points (Stage 20 clear, 1–2 cats survive).
**Average run:** ~2,075 points (dies Stage 12).

### Leaderboard Categories

- **Best Score** — composite score
- **Highest Stage** — furthest reached
- **Fastest Clear** — speedrun (Stage 20 only)
- **Total Clears** — completions count

Firebase path: `jungleLeaderboard/{cloudCode}`. Security rules require `purchases/{code}` to exist (anti-cheat lite).

### Coins Earned

```
coins = (stagesCleared × 20 + bossKills × 100) × (1 + scavengerStacks × 0.20)
```

Full clear with 2 boss kills, no Scavenger: 600 coins. With Scavenger ×3: 960 coins.

---

## 10. Save State & Run Persistence

### Auto-Save Points

1. **After each stage completion + boon selection** → full `JungleRunState` saved to localStorage and queued for cloud sync.
2. **Between battle turns** → `JungleBattleState` snapshot saved (bird HP, DOTs, debuffs, turn count).
3. **Force cloud sync on stage entry** (in addition to regular 2-min cycle) for cross-device resume.

### Resume Flow

Player returns with active run → "Resume Your Jungle Run — Stage X of 20" banner with cat HP previews. Between stages: resumes at stage transition. Mid-battle: resumes at last completed turn.

### Abandon Rules

- Explicit "Abandon Run" with confirmation dialog.
- Score calculated for stages completed.
- Cats return to main game with their current HP (no free heal on abandon).

### Edge Cases

| Scenario | Resolution |
|----------|-----------|
| Browser crash mid-battle | Resume from last completed turn |
| Device switch mid-run | Cloud sync picks up on new device |
| localStorage cleared | Restore from cloud save code |
| Profile switch | Run saved per-profile, no cross-profile interference |
| Game update mid-run | Bird stats snapshot at run start, not live values |
| Corrupted run state | Reset to idle, award partial score |

---

## 11. Replayability & Rewards

### Randomization Per Run

- **Bird encounters:** Fixed slots per stage, but which bird from the eligible pool is randomized (seeded PRNG for determinism).
- **Boon offerings:** Weighted random from pool, never the same 3 twice in a row.
- **Boss stages fixed:** Apex Raptor always at 10, Feathered King always at 20.

### Challenge Variants (Unlocked After First Stage 20 Clear)

| Modifier | Effect | Score Multiplier |
|----------|--------|-----------------|
| Predator Mode | Birds +50% HP/ATK, boons Common/Uncommon only | 2.0× |
| No Boons | No boon offerings at all | 2.5× |
| Speed Run | 45-minute timer, run ends when timer expires | 1.5× |

Modifiers stack. Predator + Speed Run = 3.0× multiplier.

### Cosmetic Rewards

| Reward | Unlock Condition | Achievement Rate | Est. Attempts |
|--------|-----------------|-----------------|---------------|
| Jungle Survivor Badge | Complete any run | 100% | 1 |
| Feathered Collar | Clear Stage 10 | 30–40% | 3–4 |
| **Vine Crest** (NEW) | Clear Stage 15 | 15–25% | 5–8 |
| Talon Blade | Clear Stage 20 | 10–15% | 8–15 |
| Jungle Crown | Stage 20, all cats alive | 2–4% | 25–50 |
| Apex Predator Title | Stage 20 in under 15 min | 3–5% | 20–35 |

Score-based cosmetic borders: Bronze (1000), Silver (3000), Gold (5000), Diamond (6000).

### Meta-Progression (Between Runs)

- **Unlockable boons** enter the pool after achievements (Crown Breaker after first Stage 10, Vengeful Spirit after first Stage 20, Lucky Dice after 5 runs, Blood Frenzy after 100 total bird kills).
- **No stat carryover** between runs. Each run starts fresh. Roguelike fairness preserved.

---

## 12. Peach Payments Integration

### Architecture

```
Frontend (React)  →  Firebase Cloud Function  →  Peach Payments API
    ↓                       ↓                          ↓
Peach SDK embed      createJungleCheckout        /v2/checkout
    ↓                       ↓                          ↓
onCompleted          peachPaymentWebhook         Webhook POST
    ↓                       ↓
Poll Firebase         Write junglePassUnlocked
```

### OAuth2 Token Caching

```typescript
// Module-level cache survives warm Cloud Function invocations
let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;
// 60-second buffer for clock drift
// Environment toggle: PEACH_ENVIRONMENT = 'sandbox' | 'production'
```

### Checkout Session

- Amount: `"120.00"` (hardcoded server-side, never sent from frontend)
- Idempotency: `cloudCode + 5-minute time window` → prevents duplicate sessions from rapid clicks
- Session expiry: 30 minutes
- `shopperResultUrl`: `https://whiskerwars.web.app/payment-complete`
- Custom parameters: `{ cloudCode, profileName, product: 'jungle-run' }`

### Webhook Security

- **HMAC-SHA256 signature verification** via `x-peach-signature` header
- **Idempotent processing** via `webhookLog/{merchantTransactionId}` — duplicate webhooks return 200 without re-processing
- **Retry policy**: Peach retries non-2xx with exponential backoff (1m → 24h → stops)

### Race Conditions

| Scenario | Resolution |
|----------|-----------|
| Webhook before frontend callback | Happy path — Firebase already has flag, frontend poll succeeds immediately |
| Frontend callback but no webhook | Optimistic local unlock + "being processed" message. Webhook arrives eventually. |
| Browser closed mid-payment | Webhook still fires. `checkJunglePurchase()` on next app load detects it. |

### Frontend SDK

- **Lazy loaded** via dynamic `<script>` tag when purchase modal opens (not bundled with Vite)
- **~80–120 KB gzipped**, zero impact on initial bundle
- Theme: `brandColour: '#10B981'` (emerald-500), font: `'Inter'`
- CSP headers needed for `js.peachpayments.com` and `checkout.peachpayments.com`

---

## 13. Firebase Cloud Functions

### Three New Functions (europe-west1)

| Function | Type | Purpose | Cold Start |
|----------|------|---------|------------|
| `createJungleCheckout` | `onCall` | Creates Peach checkout session | ~800ms |
| `peachPaymentWebhook` | `onRequest` | Receives/processes Peach webhooks | ~600ms |
| `verifyJunglePurchase` | `onCall` | Client-side purchase verification | ~500ms |

### Rate Limiting

`createJungleCheckout` rate-limits per cloudCode: max 3 requests per 10 seconds.

### Pre-purchase Checks

1. Validate cloudCode format (`/^[A-Z]+-\d{4}$/`)
2. Check if already purchased (auto-heal: set Firebase flag if purchase record exists but flag missing)
3. Verify cloud code exists in `/saves/`
4. Create checkout session

### Secrets Management

```bash
firebase functions:secrets:set PEACH_CLIENT_ID
firebase functions:secrets:set PEACH_CLIENT_SECRET
firebase functions:secrets:set PEACH_MERCHANT_ID
firebase functions:secrets:set PEACH_ENTITY_ID
firebase functions:secrets:set PEACH_WEBHOOK_SECRET
```

---

## 14. State Management

### Zustand Store Additions

```typescript
// New state fields
junglePassUnlocked: boolean;      // Persisted in save + cloud
junglePassPending: boolean;       // Transient UI state, NOT persisted
jungleRun: JungleRunState;        // Full run state (see below)
jungleStats: JungleStats;         // Lifetime jungle statistics
jungleAnnouncementShown: boolean; // One-time popup flag

// New actions
unlockJunglePass: () => void;
setJunglePassPending: (pending: boolean) => void;
checkJunglePurchase: () => Promise<void>;  // Called on app startup
startJungleRun: () => void;
selectJungleSquad: (instanceIds: [string, string, string]) => boolean;
completeJungleStage: (won: boolean, damageDealt: number, damageTaken: number) => void;
selectJungleBoon: (boonId: string) => void;
advanceJungleStage: () => void;
abandonJungleRun: () => void;
finishJungleRun: () => void;
resumeJungleRun: () => void;
```

### State Machine Phases

```
idle → squad_select → pre_battle → in_battle → boon_select → stage_cleared → pre_battle → ...
                                              → boss_intro → boon_select / run_complete
                                              → run_failed
```

Transitions validated via `canTransition(from, to)` lookup table.

### Purchase Flag Dual-Write

| Layer | Purpose | Written By |
|-------|---------|-----------|
| localStorage (per-profile) | Fast client-side gating | Client (optimistic) |
| Firebase `/saves/{code}/data/junglePassUnlocked` | Source of truth | Webhook (authoritative) |
| Firebase `/purchases/{code}` | Audit trail | Webhook only |

**Tampering accepted:** This is a $6.50 web game. DevTools tampering is possible but the audit trail remains intact and leaderboard writes require a purchase record.

### Firebase Security Rules

```json
{
  "jungleLeaderboard": {
    "$code": {
      ".read": true,
      ".write": "root.child('purchases').child($code).exists()",
      ".validate": "newData.child('bestScore').val() <= 5000 && newData.child('highestStage').val() <= 20"
    }
  },
  "purchases": { "$code": { ".read": true, ".write": false } }
}
```

---

## 15. File Map

### New Files (22)

| File | Purpose |
|------|---------|
| `src/game/birds.ts` | Bird definitions, scaling, stage selection |
| `src/game/boons.ts` | Boon definitions, weighted selection, application |
| `src/game/jungleRun.ts` | State machine, scoring, types |
| `src/game/birdAbilityResolver.ts` | Bird ability resolution (AoE, DOT, reflect, etc.) |
| `src/ui/views/JungleRunView.tsx` | Main view: map, squad select, transitions |
| `src/ui/views/JungleBattle.tsx` | Battle arena adapted for birds |
| `src/ui/components/JunglePurchaseModal.tsx` | Purchase gate with Peach SDK embed |
| `src/ui/components/JungleAnnouncementModal.tsx` | One-time announcement popup |
| `src/ui/components/JungleUnlockCelebration.tsx` | Post-purchase celebration |
| `src/ui/components/BoonPickerModal.tsx` | Post-stage boon selection (pick 1 of 3) |
| `src/ui/components/JungleVictoryModal.tsx` | Run completion screen |
| `src/ui/components/JungleDefeatModal.tsx` | Run failure screen |
| `src/ui/components/JungleBackground.tsx` | 7-layer parallax jungle background |
| `src/ui/components/BossIntroModal.tsx` | Boss cutscene/intro |
| `src/utils/peachSdk.ts` | Peach SDK lazy loader + TypeScript declarations |
| `src/utils/junglePreload.ts` | Jungle asset preloader |
| `functions/src/index.ts` | Cloud Function exports |
| `functions/src/createCheckout.ts` | Checkout session creation |
| `functions/src/peachWebhook.ts` | Webhook handler |
| `functions/src/verifyPurchase.ts` | Purchase verification |
| `functions/src/lib/peachAuth.ts` | OAuth2 token caching |
| `functions/src/lib/webhookVerification.ts` | HMAC signature verification |

### Modified Files (9)

| File | Changes |
|------|---------|
| `src/game/store.ts` | Add jungle state, actions, save/load serialization |
| `src/game/constants.ts` | Add jungle balance constants |
| `src/ui/App.tsx` | Add jungle tab, lazy-load JungleRunView, feature flag |
| `src/ui/animations.ts` | Add jungle page transition variant |
| `src/utils/cloudSave.ts` | Add jungle fields to CloudSaveData |
| `src/utils/leaderboard.ts` | Add jungle leaderboard functions |
| `src/utils/analytics.ts` | Add 11 new GA4 events |
| `tailwind.config.js` | Add jungle colors, shadows, gradients |
| `vite.config.ts` | Add jungle manual chunk for code splitting |

---

## 16. Testing Strategy

### Unit Tests (4 new test files)

- `boons.test.ts` — rollBoonChoices (rarity weights, stacking, pity timer, determinism)
- `birds.test.ts` — scaleBirdForStage, getBirdForStage (boss stages, seeded selection)
- `birdAbilityResolver.test.ts` — Each ability type resolution
- `jungleRun.test.ts` — State transitions, score calculation, squad snapshot

### Integration Tests (Manual, Peach Sandbox)

1. Generate cloud save code → Click Unlock → Test card `4200000000000000` → Verify Firebase flag + purchase record
2. Test card `4200000000000018` (declined) → Verify error handling
3. Test card `4200000000000026` (3D Secure) → Verify redirect flow
4. Close browser mid-payment → Verify webhook still processes
5. Restore cloud save on new device → Verify unlock carries over
6. Double-purchase → Verify "already unlocked" response

### Edge Case Tests

- Multiple tabs open simultaneously
- Profile switch during active run
- No cloud code → blocks checkout
- Expired checkout session (30+ min)
- Network failure during payment
- Corrupted run state recovery

---

## 17. Rollout Plan

### Phased Launch

| Phase | Timeline | Action |
|-------|----------|--------|
| **Functions staging** | Week -2 | Deploy Cloud Functions to staging Firebase project. End-to-end Peach sandbox testing. |
| **Silent deploy** | Week -1 | Deploy jungle code to production with `VITE_FEATURE_JUNGLE=false`. Verify no bundle regressions. |
| **Soft launch** | Day 0 | Set `VITE_FEATURE_JUNGLE=true`. No announcement. Monitor for crashes via analytics. |
| **Monitor** | Day 1–3 | Watch conversion funnel (modal → payment → first run). Monitor balance (stage death distribution). |
| **Public launch** | Day 3–5 | Announce on itch.io + social media. Switch Peach to production credentials. |
| **Full launch** | Day 7+ | Monitor retention (purchase → day 7 play → stage 20 clear rate). |

### Rollback Plan

- **Payment bugs:** Set `VITE_FEATURE_JUNGLE=false` → tab disappears. Use `/purchases/{code}` audit trail to identify affected players.
- **Balance issues:** Adjust constants in `constants.ts` and `birds.ts`, redeploy. No feature flag needed.

### Feature Flag

```env
VITE_FEATURE_JUNGLE=true  # Toggle in .env.production
```

```typescript
const JUNGLE_ENABLED = import.meta.env.VITE_FEATURE_JUNGLE === 'true';
```

---

## 18. Narrative

### The Story

The jungle was the last refuge of birds after cats conquered the world. The Feathered King built a kingdom to protect birdkind. The player's cats are, from the King's perspective, invaders. The King fights not out of malice but out of desperation.

### Stage Flavor Text (Excerpts)

- **Stage 1:** *"The jungle stretches before you, dense and alive. Your cats sniff the air — something feathered watches from above."*
- **Stage 10:** *"The Apex Raptor drops from the storm clouds. It lands on a throne of bone and branch. This is its domain."*
- **Stage 12:** *"The idol shows a history. Birds driven from their homes. Cats taking everything. One bird leading survivors into the jungle."*
- **Stage 20:** *"The King rises. Its feathers shimmer with every color and none. Its voice is the thunder. 'You should not have come.'"*
- **Victory:** *"'...well fought, little ones.' The King falls. Golden feathers swirl upward into sunlight."*

### Resolution

The King is not a villain. The ending creates respect between rivals:

*"Your cats look up. A golden feather drifts from the sky one last time. An understanding passes between predator and prey. The jungle will endure. The birds will endure. And the cats have earned something more valuable than victory. Respect."*

---

## Implementation Order

### Phase 1: Data & Game Logic (No UI)
1. `birds.ts` — Bird definitions
2. `boons.ts` — Boon definitions + selection algorithm
3. `birdAbilityResolver.ts` — Bird ability resolution
4. `jungleRun.ts` — State machine + scoring
5. `constants.ts` — Jungle balance constants
6. `store.ts` — Add jungle state + actions + save/load
7. Unit tests for all above

### Phase 2: UI & Game Mode
8. `JungleRunView.tsx` — Squad selection + stage map
9. `JungleBattle.tsx` — Battle adapted for birds
10. `BoonPickerModal.tsx` — Post-stage boon selection
11. `BossIntroModal.tsx` — Boss cutscenes
12. `JungleVictoryModal.tsx` / `JungleDefeatModal.tsx`
13. `JungleBackground.tsx` — Animated background
14. `App.tsx` — Navigation + feature flag
15. Tailwind config + animation additions

### Phase 3: Rewards & Leaderboard
16. Cosmetic reward definitions
17. Leaderboard extension
18. Rewards display in main game

### Phase 4: Payment Gate
19. `JunglePurchaseModal.tsx` + `JungleUnlockCelebration.tsx`
20. Firebase Cloud Functions (checkout + webhook + verify)
21. `peachSdk.ts` — SDK loader
22. End-to-end Peach sandbox testing

### Phase 5: Polish
23. Jungle artwork and bird images
24. Sound effects
25. Analytics events
26. QA and balance tuning
27. Rollout

---

*This document, combined with [`star-paws-jungle-run-ui-spec.md`](star-paws-jungle-run-ui-spec.md), provides everything needed to build Star Paws: Jungle Run without ambiguity.*
