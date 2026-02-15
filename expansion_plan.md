# Star Paws: Jungle Run — Paid Expansion Plan

> This document captures the full design, mechanics, and integration plan for the first paid DLC expansion for Whisker Wars. It is intended as a complete handoff for implementation.

---

## 1. Overview

**Name:** Star Paws: Jungle Run
**Price:** R120 ZAR (~$6-7 USD)
**Platform:** Web only (for now — no app store IAP needed)
**Payment Provider:** Peach Payments (South African gateway)
**Scope:** New game mode with its own theme, art, enemies, and progression — reuses all existing game mechanics and UI patterns

### What the player gets

- A new **roguelike endless-run game mode** set in an alien jungle
- **20 jungle stages** with escalating difficulty
- **Bird enemies** (new enemy type, replaces dogs in this mode)
- **Boon system** — choose power-ups between stages
- **Jungle-exclusive rewards** that carry back to the main game (cosmetic bragging rights)
- **Dedicated leaderboard** for jungle run scores
- New **jungle-themed background and artwork** (same UI structure, fresh visual skin)

### What stays the same

- All core battle mechanics (turn-based, dice, abilities, equipment)
- Cat squad selection from the player's existing collection
- UI layout, navigation patterns, component structure
- Zustand state management pattern
- Cloud save system (expansion unlock syncs via existing cloud save)

---

## 2. Game Mode: Jungle Run (Roguelike)

### Core Loop

```
Select Squad (3 cats from collection)
  → Enter Jungle Stage 1
    → Battle bird enemies (same turn-based combat)
    → Victory → Choose 1 of 3 random Boons
    → Cats carry HP/status between stages (no free healing)
    → Next Stage (harder birds, more abilities)
    → ...repeat...
  → Run ends when squad is wiped OR stage 20 is cleared
  → Score calculated → Leaderboard submission
```

### Run Rules

- **No healing between stages** — HP carries over (roguelike tension)
- **Boon selection after each stage** — pick 1 of 3 random boons to buff your squad for the rest of the run
- **Escalating difficulty** — bird stats scale per stage, new bird abilities unlock at certain thresholds
- **One life** — when all 3 cats are KO'd, the run ends
- **Score = stages cleared + bonus modifiers** (speed, remaining HP, boons used, etc.)

### Run State (new state to track)

```typescript
interface JungleRunState {
  active: boolean;
  currentStage: number;        // 1-20
  squad: JungleRunCat[];       // 3 cats with carried-over HP
  activeBoons: Boon[];         // accumulated boons for this run
  score: number;
  startedAt: number;           // timestamp
  completedStages: number;     // for scoring
}

interface JungleRunCat {
  ownedCatId: string;          // reference to player's OwnedCat
  currentHp: number;           // carried between stages
  maxHp: number;
  boonBuffs: Record<string, number>; // stat modifications from boons
}
```

---

## 3. Bird Enemies (New Entity Type)

Birds replace dogs as the enemy type in jungle mode. They follow the same combat interface but have unique jungle-themed abilities.

### Proposed Bird Roster (10-12 birds across difficulty tiers)

| Bird | Tier | Special Ability | Stage Range |
|------|------|----------------|-------------|
| Jungle Sparrow | 1 | Quick Peck (low damage, high speed) | 1-4 |
| Canopy Parrot | 1 | Mimicry (copies a cat's last ability) | 1-4 |
| Vine Weaver | 2 | Entangle (reduces cat speed for 2 turns) | 3-8 |
| Toucan Bruiser | 2 | Beak Slam (heavy single-target) | 5-10 |
| Storm Hawk | 3 | Dive Bomb (AoE damage) | 7-14 |
| Shadow Owl | 3 | Night Vision (never misses, ignores evasion) | 8-14 |
| Thornback Heron | 4 | Reflect Thorns (returns 20% damage) | 10-16 |
| Ember Phoenix | 4 | Rebirth (revives once at 50% HP) | 12-18 |
| Jungle Wyvern | 5 | Poison Breath (DoT 3 turns) | 15-20 |
| Apex Raptor | Boss | All abilities rotate each turn | Stage 10 (mid-boss) |
| The Feathered King | Boss | Phase shifts at 50%/25% HP, new moveset each phase | Stage 20 (final boss) |

### Bird Data Structure

```typescript
// Follows same pattern as Dog in src/game/data.ts
interface Bird {
  id: string;
  name: string;
  emoji: string;         // or image reference
  tier: number;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  ability: BirdAbility;
  stageRange: [number, number]; // min-max stage appearance
  isBoss: boolean;
}

interface BirdAbility {
  name: string;
  description: string;
  type: 'damage' | 'debuff' | 'aoe' | 'heal' | 'special';
  power: number;
  chance: number;         // 0-1 probability of using ability vs basic attack
}
```

---

## 4. Boon System

After each stage victory, the player picks 1 of 3 randomly offered boons. Boons stack and last for the entire run.

### Boon Categories

**Offensive:**
- Predator's Edge — +10% attack to all cats
- Critical Claws — +15% crit chance
- Feral Frenzy — +1 extra attack per turn (25% chance)
- Venom Tips — Attacks apply 1-turn poison

**Defensive:**
- Thick Fur — +10% defense to all cats
- Jungle Resilience — Heal 5% max HP after each stage
- Evasive Instinct — +10% dodge chance
- Second Wind — Once per run, revive a KO'd cat at 25% HP

**Utility:**
- Swift Paws — +15% speed (act first more often)
- Scavenger — +20% coin bonus from battles
- Lucky Find — Higher chance of rare boons in future picks
- Combo Master — Ability effects increased by 10%

### Boon Data Structure

```typescript
interface Boon {
  id: string;
  name: string;
  description: string;
  category: 'offensive' | 'defensive' | 'utility';
  rarity: 'common' | 'rare' | 'legendary';  // affects drop weight
  effect: {
    stat?: string;          // which stat to modify
    modifier?: number;      // percentage or flat value
    special?: string;       // for unique effects like "revive" or "poison"
  };
  stackable: boolean;       // can you pick the same boon twice?
  maxStacks?: number;
}
```

---

## 5. Jungle-Exclusive Rewards

Items earned in Jungle Run that carry back to the main game. These are cosmetic / bragging-rights items, NOT pay-to-win stat boosts.

| Reward | Unlocked By | Effect in Main Game |
|--------|-------------|-------------------|
| Feathered Collar | Clear stage 10 | Cosmetic equipment, shows on cat card |
| Talon Blade | Clear stage 20 | Cosmetic weapon, unique card border |
| Jungle Crown | Clear stage 20 with all cats alive | Rare cosmetic, animated card effect |
| "Jungle Survivor" Badge | Complete any run | Profile badge on leaderboard |
| "Apex Predator" Title | Clear stage 20 under X turns | Profile title |

> Design principle: These rewards look cool and show achievement but don't give stat advantages in the base game. No pay-to-win.

---

## 6. Leaderboard Extension

Extend the existing Firebase leaderboard system (`src/utils/leaderboard.ts`) with jungle-specific categories.

### New Leaderboard Categories

- **Highest Jungle Stage** — furthest stage reached
- **Best Jungle Score** — composite score (stages + speed + HP bonus)
- **Fastest Stage 20 Clear** — speedrun leaderboard
- **Most Jungle Runs Completed** — total completions

### Storage Path

```
leaderboard/{cloudCode}/jungleRun: {
  highestStage: number,
  bestScore: number,
  fastestClear: number | null,
  totalRuns: number,
  lastRunAt: string
}
```

---

## 7. Unlock Gate & Purchase Flow

### State Addition

Add to the Zustand store (`src/game/store.ts`):

```typescript
// In GameState interface
junglePassUnlocked: boolean;  // false by default

// In store initial state
junglePassUnlocked: false,
```

This flag persists via the existing localStorage + cloud save system. Once unlocked, it syncs across devices via cloud save codes.

### UI Gate

When the player navigates to the Jungle Run mode:

```
if (!junglePassUnlocked) {
  → Show JunglePreviewModal
    - Jungle artwork teaser
    - Feature list (20 stages, birds, boons, rewards)
    - "Unlock for R120" button → triggers Peach Payments checkout
    - "Maybe later" dismiss button
} else {
  → Show JungleRunView (squad select → start run)
}
```

### Navigation

Add a new view option to the existing view system:

```typescript
// Extend the View type in store.ts
type View = 'bait' | 'collection' | 'inventory' | 'battle' | 'training' | 'stats' | 'guide' | 'privacy' | 'terms' | 'jungle';
```

Add a "Jungle Run" button/tab to the main navigation in `src/ui/App.tsx`. Style it with a jungle theme and a lock icon when not yet purchased.

---

## 8. Peach Payments Integration (Web Only)

### Why Peach Payments

- South African payment gateway, ZAR-native pricing
- No monthly/setup fees
- Transaction fee: 2.95% + R1.50 (excl. VAT) per transaction (~R5 on R120)
- Supports: Visa, Mastercard, Amex, SnapScan, Ozow (instant EFT), PayJustNow (BNPL)
- PCI DSS Level 1 certified
- Next-business-day settlements
- Clean JavaScript SDK (Embedded Checkout)

### Integration Architecture

```
┌──────────────────┐     ┌──────────────────────┐     ┌──────────────┐
│  Whisker Wars UI │     │  Firebase Cloud Func  │     │    Peach      │
│  (React frontend)│     │  (backend)            │     │   Payments    │
│                  │     │                       │     │              │
│ 1. Player clicks │────►│ 2. POST /v2/checkout  │────►│ 3. Returns   │
│    "Unlock R120" │     │    (creates session)  │◄────│    checkoutId│
│                  │◄────│ 3. Return checkoutId  │     │              │
│ 4. Render Peach  │     │                       │     │              │
│    Checkout SDK  │─────────────────────────────────►│ 5. Payment   │
│                  │     │                       │     │    processed │
│                  │     │ 6. Webhook received   │◄────│ 6. Webhook   │
│                  │     │    verify + unlock    │     │    callback  │
│ 7. onCompleted   │◄────│ 7. Confirm to client  │     │              │
│    set flag=true │     │                       │     │              │
└──────────────────┘     └──────────────────────┘     └──────────────┘
```

### Step-by-Step Flow

#### Backend (Firebase Cloud Function)

```typescript
// functions/src/createCheckout.ts
// Endpoint: POST /api/createJungleCheckout

import * as functions from 'firebase-functions';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

export const createJungleCheckout = functions.https.onCall(async (data, context) => {
  const { cloudCode } = data; // player's cloud save code

  // 1. Get auth token from Peach
  const tokenRes = await fetch('https://auth.peachpayments.com/api/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.PEACH_CLIENT_ID,
      client_secret: process.env.PEACH_CLIENT_SECRET,
      merchant_id: process.env.PEACH_MERCHANT_ID,
      grant_type: 'client_credentials',
    }),
  });
  const { access_token } = await tokenRes.json();

  // 2. Create checkout session
  const checkoutRes = await fetch('https://api.peachpayments.com/v2/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${access_token}`,
      'X-Idempotency-Key': uuidv4(),
    },
    body: JSON.stringify({
      authentication: { entityId: process.env.PEACH_ENTITY_ID },
      amount: '120.00',
      currency: 'ZAR',
      nonce: uuidv4(),
      shopperResultUrl: 'https://whiskerwars.web.app/payment-complete',
      merchantTransactionId: `jungle-${cloudCode}-${Date.now()}`,
      customParameters: { cloudCode },
    }),
  });
  const { checkoutId } = await checkoutRes.json();

  return { checkoutId };
});
```

#### Frontend (React)

```typescript
// src/ui/components/JunglePurchaseModal.tsx

// 1. Load Peach SDK script (add to index.html or dynamically):
// <script src="https://js.peachpayments.com/v2/checkout.js"></script>

// 2. Create checkout session via Cloud Function
const { checkoutId } = await createJungleCheckout({ cloudCode });

// 3. Initiate and render
const checkout = await Checkout.initiate({
  key: PEACH_ENTITY_ID,        // public entity ID (safe for frontend)
  checkoutId: checkoutId,
  options: {
    theme: {
      brandColour: '#4A1D96',  // match Whisker Wars purple theme
      font: 'Inter',
    },
  },
  eventHandlers: {
    onCompleted: (event) => {
      // Payment succeeded — unlock the expansion
      store.getState().unlockJunglePass();
      // Navigate to jungle view
      store.getState().setView('jungle');
    },
    onCancelled: () => {
      // Player cancelled — dismiss modal
    },
    onError: (error) => {
      // Show error toast
      console.error('Payment error:', error);
    },
  },
});

checkout.render('#peach-checkout-container');
```

#### Webhook Verification (Firebase Cloud Function)

```typescript
// functions/src/peachWebhook.ts
// Peach sends a POST to your webhook URL after payment

export const peachPaymentWebhook = functions.https.onRequest(async (req, res) => {
  const { merchantTransactionId, result, customParameters } = req.body;

  // Verify the payment was successful
  if (result.code === '000.100.110') { // Success code
    const { cloudCode } = customParameters;

    // Mark the expansion as unlocked in Firebase
    await admin.database()
      .ref(`saves/${cloudCode}/junglePassUnlocked`)
      .set(true);

    // Also store transaction record
    await admin.database()
      .ref(`purchases/${cloudCode}`)
      .push({
        product: 'jungle-run',
        amount: 120,
        currency: 'ZAR',
        transactionId: merchantTransactionId,
        timestamp: Date.now(),
      });
  }

  res.status(200).send('OK');
});
```

### Peach Payments Setup Checklist

- [ ] Register at [peachpayments.com](https://www.peachpayments.com/) for a merchant account
- [ ] Get sandbox/test credentials (client ID, client secret, entity ID, merchant ID)
- [ ] Allowlist your domain in Peach dashboard (e.g., `whiskerwars.web.app`)
- [ ] Set up webhook URL in Peach dashboard pointing to your Cloud Function
- [ ] Test with Peach sandbox environment before going live
- [ ] Switch to production credentials for launch

### Peach Developer Docs

- [Developer Hub](https://developer.peachpayments.com/)
- [Embedded Checkout Overview](https://developer.peachpayments.com/docs/checkout-embedded)
- [Embedded Checkout Tutorial](https://developer.peachpayments.com/docs/checkout-embedded-tutorial)
- [Embedded Checkout SDK Reference](https://developer.peachpayments.com/docs/checkout-embedded-sdk-reference)
- [Authentication](https://developer.peachpayments.com/docs/checkout-embedded-authentication)
- [Fees](https://www.peachpayments.com/fees/)

---

## 9. File Map — Where Things Go

Implementation should follow the existing architecture patterns:

| New File / Change | Purpose |
|---|---|
| `src/game/birds.ts` | Bird enemy definitions (like `data.ts` has dogs) |
| `src/game/boons.ts` | Boon definitions and roll logic |
| `src/game/jungleRun.ts` | Jungle run state machine, stage progression, scoring |
| `src/game/store.ts` | Add `junglePassUnlocked`, `jungleRun` state, and actions |
| `src/game/constants.ts` | Add jungle balance constants (stage scaling, boon weights) |
| `src/ui/views/JungleRunView.tsx` | Main jungle run view (squad select, stage map, active run) |
| `src/ui/components/JunglePurchaseModal.tsx` | Purchase gate with Peach Checkout embed |
| `src/ui/components/BoonPickerModal.tsx` | Post-stage boon selection (pick 1 of 3) |
| `src/ui/components/JungleVictoryModal.tsx` | Run completion / game over screen with score |
| `src/ui/App.tsx` | Add 'jungle' to navigation, add jungle tab/button |
| `src/utils/leaderboard.ts` | Extend with jungle leaderboard categories |
| `src/utils/cloudSave.ts` | Ensure `junglePassUnlocked` persists in cloud saves |
| `functions/src/createCheckout.ts` | Firebase Cloud Function for Peach checkout session |
| `functions/src/peachWebhook.ts` | Firebase Cloud Function for Peach webhook |
| `public/images/jungle/` | Jungle-themed backgrounds, bird artwork |

---

## 10. Implementation Order

Recommended build sequence:

### Phase 1: Data & Game Logic (no UI yet)
1. Define bird enemies in `src/game/birds.ts`
2. Define boons in `src/game/boons.ts`
3. Build jungle run state machine in `src/game/jungleRun.ts`
4. Add jungle constants to `src/game/constants.ts`
5. Extend store with `junglePassUnlocked` flag and jungle run state/actions

### Phase 2: UI & Game Mode
6. Build `JungleRunView.tsx` — squad selection, stage map, active battle
7. Build `BoonPickerModal.tsx` — post-stage boon choice
8. Build `JungleVictoryModal.tsx` — run end screen with scoring
9. Add jungle navigation to `App.tsx`
10. Add jungle-specific theming (background, colors)

### Phase 3: Rewards & Leaderboard
11. Define jungle-exclusive reward items
12. Extend leaderboard with jungle categories
13. Wire up reward unlocks to main game

### Phase 4: Payment Gate
14. Build `JunglePurchaseModal.tsx` with preview content
15. Set up Firebase Cloud Functions for Peach integration
16. Wire up unlock flow (payment → webhook → flag → access)
17. Test end-to-end with Peach sandbox

### Phase 5: Polish
18. Jungle artwork and backgrounds
19. Sound effects for birds and jungle ambience
20. Analytics events for jungle run tracking
21. QA and balance testing

---

## 11. Future Expansion Template

If Jungle Run succeeds, the same pattern repeats for future DLC:

| Expansion | Theme | Enemies | Price |
|-----------|-------|---------|-------|
| Star Paws: Jungle Run | Alien jungle | Birds | R120 |
| Star Paws: Deep Dive | Ocean trenches | Fish / Crabs | R120 |
| Star Paws: Sky Siege | Floating islands | Dragons / Bats | R120 |
| Star Paws: All Access | Bundle | All of the above | R280 |

Each expansion reuses the same roguelike run structure, boon system, and purchase flow — just swap enemies, art, and theme. The `junglePassUnlocked` pattern generalises to `expansionUnlocked: Record<string, boolean>`.

---

## 12. Key Design Principles

1. **Not pay-to-win** — Expansion rewards are cosmetic only. No stat advantages in the base game.
2. **Self-contained** — Jungle Run doesn't break or gate any existing free content.
3. **Reuses everything** — Same battle system, same UI patterns, same state management. New content, not new architecture.
4. **Web-first** — Peach Payments, no app store IAP complexity. Mobile app store versions can be added later with Apple/Google IAP.
5. **Cloud-synced unlock** — Purchase flag stored in Firebase alongside existing cloud save. Buy once, access anywhere you load your save code.
