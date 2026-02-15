# Star Paws: Jungle Run -- Complete UI/UX Specification

> Production-ready design specification for the Whisker Wars paid expansion.
> Covers every screen, modal, transition, micro-interaction, state, and edge case.
> References existing codebase patterns (Tailwind classes, Framer-Motion configs, Zustand selectors, component structure) from the actual source files.

---

## Table of Contents

1. [Discovery & Notification System](#1-discovery--notification-system)
2. [Purchase Flow](#2-purchase-flow)
3. [Navigation Changes](#3-navigation-changes)
4. [Jungle Theme System](#4-jungle-theme-system)
5. [Squad Selection Screen](#5-squad-selection-screen)
6. [Active Run UI](#6-active-run-ui)
7. [Boon Selection Modal](#7-boon-selection-modal)
8. [Boss Encounters](#8-boss-encounters)
9. [Run End Screens](#9-run-end-screens)
10. [Jungle Leaderboard](#10-jungle-leaderboard)
11. [Rewards in Main Game](#11-rewards-in-main-game)
12. [Accessibility & Polish](#12-accessibility--polish)
13. [Appendix: Component File Map](#appendix-component-file-map)
14. [Appendix: Framer-Motion Animation Reference](#appendix-framer-motion-animation-reference)
15. [Appendix: Tailwind Configuration Additions](#appendix-tailwind-configuration-additions)

---

## 1. Discovery & Notification System

### 1.1 Entry Points (Multi-Layered Awareness)

Players learn about the expansion through three coordinated channels, none of which block gameplay.

#### A. Event Banner (Primary Discovery)

**File to modify:** `src/ui/components/EventBanner.tsx`

After the expansion update ships, add a persistent promotional banner that renders above the existing event banners. This uses the exact same `EventBanner` component pattern already in place (the same `motion.div` with `initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}` and gradient background).

**Layout:**

```
[jungle leaf icon] Star Paws: Jungle Run is HERE!        [Preview] [X]
                    20 stages. Bird enemies. New rewards.
```

**Implementation:**

```tsx
<motion.div
  initial={{ opacity: 0, y: -10 }}
  animate={{ opacity: 1, y: 0 }}
  className="p-3 rounded-xl bg-gradient-to-r from-emerald-900/80 via-green-800/80 to-teal-900/80 border border-emerald-500/40 mb-2 relative overflow-hidden"
>
  {/* Animated accent glow */}
  <div className="absolute inset-0 opacity-10">
    <div className="absolute -left-4 top-0 w-24 h-24 bg-emerald-400 rounded-full blur-3xl" />
    <div className="absolute -right-4 bottom-0 w-20 h-20 bg-teal-400 rounded-full blur-3xl" />
  </div>

  <div className="flex items-center justify-between gap-3 relative z-10">
    <div className="flex items-center gap-3 min-w-0">
      <span className="text-2xl flex-shrink-0">🌴</span>
      <div className="min-w-0">
        <p className="text-white font-bold text-sm truncate">
          Star Paws: Jungle Run is HERE!
        </p>
        <p className="text-emerald-200/70 text-xs truncate">
          20 stages. Bird enemies. New rewards. R120 ZAR.
        </p>
      </div>
    </div>
    <div className="flex items-center gap-2 flex-shrink-0">
      <motion.button
        onClick={() => setView('jungle')}
        className="px-3 py-1.5 rounded-lg bg-emerald-500/80 text-white text-xs font-bold hover:bg-emerald-400 transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        Preview
      </motion.button>
      <button
        onClick={dismissJungleBanner}
        className="text-emerald-300/50 hover:text-white p-1 transition-colors"
        aria-label="Dismiss"
      >
        x
      </button>
    </div>
  </div>
</motion.div>
```

**Visibility Rules:**
- Shows for ALL players who have NOT purchased the expansion AND have NOT dismissed the banner in the current session.
- Stores dismiss state in `sessionStorage` with key `jungle-promo-dismissed-v1` -- the banner returns next session.
- For players who HAVE purchased, the banner never renders (gated by `!junglePassUnlocked`).
- Banner renders regardless of progression. There is no gating by dog index or level.

**Dismissal Persistence:**
- `sessionStorage.setItem('jungle-promo-dismissed-v1', '1')` on dismiss click.
- This means the banner reappears each time the player opens a new browser tab or restarts the app. This is intentional -- light re-engagement without annoyance.

#### B. One-Time Popup Modal (Post-Update)

**New file:** `src/ui/components/JungleAnnouncementModal.tsx`

A one-time full-screen announcement modal that appears the FIRST time the player opens the app after the expansion update. Built using the existing `Modal` component with `size="lg"`.

**Trigger Conditions:**
- Player has completed the tutorial (`tutorialCompleted === true`).
- Player has at least 1 owned cat (not a brand-new profile).
- The flag `jungleAnnouncementShown` in the Zustand store is `false`.
- Player has NOT already purchased the expansion.

**Timing:** Appears 1500ms after the app loads (after splash screen, after daily reward if applicable). Queued behind daily reward modal and Frenzy Friday modal using the same `setTimeout` chain pattern already in `App.tsx`.

**Layout:**

```
+--------------------------------------------------+
|  [dark overlay bg-slate-950/90 backdrop-blur-md]  |
|                                                    |
|        [Jungle key art / hero image]               |
|        (public/images/jungle/hero-art.png)         |
|                                                    |
|     STAR PAWS: JUNGLE RUN                          |
|     text-3xl font-black text-emerald-300           |
|                                                    |
|     A new roguelike adventure awaits.              |
|                                                    |
|     [check] 20 stages of escalating danger         |
|     [check] Bird enemies with unique abilities     |
|     [check] Boon power-up system                   |
|     [check] Exclusive cosmetic rewards             |
|     [check] Dedicated leaderboard                  |
|                                                    |
|     [  Explore Now  ]   [  Maybe Later  ]          |
|                                                    |
+--------------------------------------------------+
```

**Framer-Motion Animation:**

```typescript
// Modal container
initial={{ opacity: 0, scale: 0.85 }}
animate={{ opacity: 1, scale: 1 }}
exit={{ opacity: 0, scale: 0.85 }}
transition={{ type: 'spring', stiffness: 250, damping: 28 }}

// Hero image
initial={{ opacity: 0, y: 30 }}
animate={{ opacity: 1, y: 0 }}
transition={{ delay: 0.2, duration: 0.6 }}

// Feature list items (staggered, same pattern as containerVariants in animations.ts)
// container: staggerChildren: 0.08
// each item: initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }}

// Buttons
initial={{ opacity: 0, y: 10 }}
animate={{ opacity: 1, y: 0 }}
transition={{ delay: 0.5 }}
```

**Interactions:**
- "Explore Now" -> sets `jungleAnnouncementShown = true`, navigates to `'jungle'` view (which shows the preview/purchase gate).
- "Maybe Later" -> sets `jungleAnnouncementShown = true`, closes modal.
- Clicking the backdrop also closes (same as Modal component pattern).
- Escape key closes.

**State Addition to Store (`src/game/store.ts`):**
```typescript
jungleAnnouncementShown: boolean  // persisted in save, defaults to false
```

#### C. Jungle Tab in Navigation (Always Visible)

The Jungle Run tab is ALWAYS visible in the navigation bar, even for players who have not purchased the expansion. This serves as a permanent visual reminder and discovery point.

When not purchased, the tab displays a small lock icon and glows subtly green. Full details in Section 3.

### 1.2 Teaser Experience for Non-Purchasers

When a non-purchaser taps the Jungle tab, they see the `JunglePreviewModal` (Section 2.1) instead of the game content. The view also renders a background teaser:

- The jungle animated background (Section 4.3) loads and animates behind the purchase modal.
- Three blurred, locked bird enemy cards are visible in a grid behind the modal overlay.
- The stage map shows stages 1-3 faintly visible (dimmed, with lock icons on stages 4-20).

### 1.3 Re-Engagement for Dismissed Players

Players who dismissed the popup or banner encounter the expansion through:

1. **Persistent Tab**: The jungle tab with its lock icon + green glow is always in the nav bar (Section 3).
2. **Session-Scoped Banner**: The EventBanner re-appears on next session (not stored in permanent save).
3. **Stats View Teaser**: The StatsView shows a "Jungle Run" leaderboard tab (locked, with "Unlock Jungle Run to compete" message). This creates FOMO when players see the leaderboard without being able to participate.
4. **No Re-Popup**: The full-screen announcement modal is strictly one-time. No spam.

### 1.4 Notification Dot / Badge System

A green notification dot appears on the Jungle tab when:
- The expansion has just been released and the player has not visited the jungle view yet (controlled by `jungleTabVisited: boolean` in store).
- A new personal best score appears on the jungle leaderboard (if purchased).
- New seasonal jungle rewards are available (future content updates).

**Badge Implementation (same pattern as the AchievementsButton badge in App.tsx):**
```tsx
{showJungleBadge && (
  <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center shadow-lg border border-white/20 animate-pulse">
    !
  </span>
)}
```

---

## 2. Purchase Flow

### 2.1 JunglePreviewModal

**New file:** `src/ui/components/JunglePreviewModal.tsx`

This modal appears when an unpurchased player navigates to the jungle view. It is a FULL modal (not a small popup) that fills the viewport and serves as both a marketing page and a payment trigger.

**Uses:** Extends the existing `Modal` component with `size="lg"`.

**Layout (Scrollable):**

```
+--------------------------------------------------------------+
| [Header: bg-gradient from-emerald-900 to-teal-900]           |
|   STAR PAWS: JUNGLE RUN                           [X close]  |
+--------------------------------------------------------------+
|                                                                |
|   [Hero Image Section]                                         |
|   Full-width jungle key art banner (aspect-ratio 16/7)        |
|   Parallax slight movement on scroll                           |
|   Overlay gradient: from-transparent to-slate-900              |
|                                                                |
|   [Feature Cards Grid - 2 columns on desktop, 1 on mobile]   |
|                                                                |
|   +---------------------------+  +---------------------------+ |
|   | [bird icon]               |  | [shield icon]             | |
|   | 20 STAGES                 |  | BOON SYSTEM               | |
|   | Battle through escalating |  | Choose power-ups between  | |
|   | jungle encounters         |  | each stage                | |
|   +---------------------------+  +---------------------------+ |
|   +---------------------------+  +---------------------------+ |
|   | [feather icon]            |  | [trophy icon]             | |
|   | BIRD ENEMIES              |  | EXCLUSIVE REWARDS         | |
|   | 11 unique birds with      |  | Cosmetics that carry to   | |
|   | special abilities         |  | the main game             | |
|   +---------------------------+  +---------------------------+ |
|   +---------------------------+  +---------------------------+ |
|   | [crown icon]              |  | [chart icon]              | |
|   | BOSS BATTLES              |  | LEADERBOARD               | |
|   | Face the Apex Raptor and  |  | Compete for the highest   | |
|   | The Feathered King        |  | jungle run score           | |
|   +---------------------------+  +---------------------------+ |
|                                                                |
|   [Bird Preview Strip]                                         |
|   Horizontal scrollable strip of 4 bird cards (blurred/        |
|   teaser versions): Jungle Sparrow, Storm Hawk,               |
|   Ember Phoenix, The Feathered King                            |
|                                                                |
|   [Divider line: border-emerald-500/30]                       |
|                                                                |
|   [Price Section - centered]                                   |
|   "Unlock the Jungle"                                          |
|    R120 ZAR                                                    |
|   "One-time purchase. No subscriptions."                       |
|   "Syncs via your cloud save code."                            |
|                                                                |
|   [ Unlock for R120 ]  (primary CTA button)                   |
|                                                                |
|   [Trust Badges]                                               |
|   "Secure payment via Peach Payments"                          |
|   [Visa] [Mastercard] [SnapScan] [Ozow] icons                 |
|                                                                |
+--------------------------------------------------------------+
```

**Feature Card Component:**

```tsx
<div className="p-4 rounded-xl bg-slate-800/50 border border-emerald-500/20 hover:border-emerald-500/40 transition-all">
  <div className="text-3xl mb-2">{icon}</div>
  <h4 className="font-black text-white text-sm uppercase tracking-wider mb-1">
    {title}
  </h4>
  <p className="text-slate-400 text-xs leading-relaxed">
    {description}
  </p>
</div>
```

**CTA Button:**

```tsx
<motion.button
  onClick={handlePurchase}
  className="w-full max-w-sm mx-auto px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-lg rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.4),0_0_40px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6),0_0_60px_rgba(16,185,129,0.3)] transition-all duration-300"
  whileHover={{ scale: 1.03, y: -2 }}
  whileTap={{ scale: 0.97 }}
>
  Unlock for R120
</motion.button>
```

**Bird Preview Card (Blurred Teaser):**

```tsx
<div className="relative w-40 h-56 rounded-xl overflow-hidden flex-shrink-0 border border-emerald-500/30">
  <img
    src={bird.imageUrl}
    alt={bird.name}
    className="w-full h-full object-cover blur-sm"
  />
  <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
    <div className="text-center">
      <span className="text-3xl">🔒</span>
      <p className="text-white font-bold text-xs mt-1">{bird.name}</p>
    </div>
  </div>
</div>
```

### 2.2 Peach Payments Checkout Integration

When the player clicks "Unlock for R120", the modal transitions from the preview state to the checkout state.

**Phase 1: Creating Checkout Session**

The CTA button is replaced with a loading state:

```tsx
<div className="flex flex-col items-center gap-3 py-8">
  <motion.div
    className="w-10 h-10 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full"
    animate={{ rotate: 360 }}
    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
  />
  <p className="text-slate-300 text-sm font-medium">
    Preparing secure checkout...
  </p>
</div>
```

This shows while the Firebase Cloud Function `createJungleCheckout` is called.

**Phase 2: Checkout Embed Renders**

The Peach Payments embedded checkout renders inside a dedicated container within the modal:

```tsx
<div className="space-y-4">
  <h3 className="text-lg font-bold text-white text-center">
    Complete Your Purchase
  </h3>
  <div className="bg-slate-800/50 rounded-xl border border-emerald-500/20 p-4">
    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700/50">
      <span className="text-slate-300 text-sm">Star Paws: Jungle Run</span>
      <span className="text-emerald-400 font-bold">R120.00</span>
    </div>
    {/* Peach Payments renders here */}
    <div id="peach-checkout-container" className="min-h-[200px]" />
  </div>
  <p className="text-slate-500 text-xs text-center">
    Secure payment processed by Peach Payments.
    Your purchase syncs to your cloud save code.
  </p>
</div>
```

The Peach Checkout SDK is configured with brand theming:

```typescript
const checkout = await Checkout.initiate({
  key: PEACH_ENTITY_ID,
  checkoutId,
  options: {
    theme: {
      brandColour: '#10B981',  // emerald-500, matching jungle theme
      font: 'Inter',
    },
  },
  // ... event handlers
})
checkout.render('#peach-checkout-container')
```

**Phase 3: Processing State**

After the player submits payment details, before the result comes back:

```tsx
<div className="flex flex-col items-center gap-4 py-12">
  <motion.div
    className="w-12 h-12 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full"
    animate={{ rotate: 360 }}
    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
  />
  <p className="text-white font-bold text-lg">Processing payment...</p>
  <p className="text-slate-400 text-sm">Please don't close this window.</p>
</div>
```

### 2.3 Purchase Success Celebration

**New file:** `src/ui/components/JungleUnlockCelebration.tsx`

When `onCompleted` fires from the Peach SDK, the checkout modal transitions into a full-screen celebration. This uses the same pattern as `CatchCelebrationModal.tsx` but with a jungle theme.

**Animation Sequence (1800ms total):**

1. **0ms**: Modal background flashes from slate to emerald (`bg-emerald-900/95`). `ParticleSystem` fires with emerald/gold particles at screen center.

2. **200ms**: Large crown icon drops in from above:
```typescript
initial={{ opacity: 0, y: -60, scale: 0.5, rotate: -20 }}
animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
transition={{ type: 'spring', stiffness: 180, damping: 14, delay: 0.2 }}
```

3. **500ms**: "UNLOCKED!" text scales in:
```typescript
initial={{ opacity: 0, scale: 0 }}
animate={{ opacity: 1, scale: 1 }}
transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.5 }}
```

4. **800ms**: Feature unlock list fades in with staggered items:
```
"20 jungle stages"
"11 unique bird enemies"
"Boon power-up system"
"Exclusive cosmetic rewards"
"Jungle leaderboard"
```
Each item: `initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}` with `staggerChildren: 0.08` and `delayChildren: 0.8`.

5. **1200ms**: "Enter the Jungle" CTA button fades in:
```typescript
initial={{ opacity: 0, y: 15 }}
animate={{ opacity: 1, y: 0 }}
transition={{ delay: 1.2, duration: 0.4 }}
```

**Full Layout:**

```
+--------------------------------------------------------------+
|  [bg-emerald-900/95 backdrop-blur-xl]                         |
|                                                                |
|  [ParticleSystem burst - emerald/gold particles]              |
|                                                                |
|                       [crown emoji 6xl]                        |
|                                                                |
|                   U N L O C K E D !                            |
|                 text-4xl font-black                             |
|            bg-clip-text text-transparent                        |
|        bg-gradient-to-r from-emerald-300 to-teal-300          |
|                                                                |
|          Star Paws: Jungle Run is yours.                       |
|                                                                |
|          [checkmark] 20 jungle stages                          |
|          [checkmark] 11 unique bird enemies                    |
|          [checkmark] Boon power-up system                      |
|          [checkmark] Exclusive cosmetic rewards                |
|          [checkmark] Jungle leaderboard                        |
|                                                                |
|     [    Enter the Jungle    ]                                 |
|     bg-gradient-to-r from-emerald-500 to-teal-500             |
|     shadow-[0_0_30px_rgba(16,185,129,0.5)]                    |
|                                                                |
|   "Receipt sent. Purchase syncs with your save code."          |
|   text-xs text-slate-500                                       |
|                                                                |
+--------------------------------------------------------------+
```

**Sound:** Play a new `jungleUnlock` sound effect (triumphant jungle horn + bird calls, 2s duration).

**State Changes on Success:**
```typescript
// In onCompleted handler:
store.getState().unlockJunglePass()    // sets junglePassUnlocked = true
store.getState().setView('jungle')     // navigate after celebration dismiss
```

### 2.4 Failure / Cancellation Handling

**Payment Failed:**

```tsx
<div className="text-center py-8">
  <div className="text-5xl mb-4">😿</div>
  <h3 className="text-xl font-bold text-red-400 mb-2">
    Payment could not be processed
  </h3>
  <p className="text-slate-400 text-sm mb-6 max-w-xs mx-auto">
    No charge was made. Please check your card details or try a different
    payment method.
  </p>
  <div className="flex gap-3 justify-center">
    <motion.button
      onClick={retryCheckout}
      className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-lg"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      Try Again
    </motion.button>
    <motion.button
      onClick={closeModal}
      className="px-5 py-2.5 bg-slate-700 text-slate-300 font-bold rounded-lg"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      Cancel
    </motion.button>
  </div>
</div>
```

**Payment Cancelled (User Dismissed):**

The modal simply returns to the preview state. No error message. The CTA button reappears.

### 2.5 "Already Purchased" State (Cloud Save Restore)

When a player loads a cloud save that has `junglePassUnlocked: true`:
- The jungle tab shows as fully unlocked (no lock icon).
- No purchase modal ever appears.
- No banner or announcement shows.
- The jungle view loads directly into the squad selection screen.

If the player's LOCAL state says not purchased but the CLOUD save says purchased (e.g., new device), the `load()` function in the store syncs the flag and the UI updates reactively via Zustand selectors.

---

## 3. Navigation Changes

### 3.1 Tab Bar Addition

The "Jungle" tab is inserted between "Train" and "Stats" in both the desktop and mobile navigation arrays.

**Desktop Tab Definition (in `App.tsx` nav array):**

```typescript
{
  id: 'jungle',
  label: 'Jungle',
  icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.5 5.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5zm-4.15 5.35L8.5 18h2l1.85-5.5L14 14v4h2v-5.5l-1.65-1.65L15 8.5c.6-1.1 1.6-2 2.9-2.1v-2c-2.1.1-3.8 1.2-4.8 2.9l-.7 1.1-2.05-2.05zM6 18V6h2v12H6z" />
  </svg>,
  gradient: 'from-emerald-500 to-teal-500'
}
```

**Mobile Tab Definition:**
Same structure with `w-6 h-6` icon size, following the existing mobile icon scaling pattern.

### 3.2 Lock State (Not Purchased)

When `junglePassUnlocked === false`, the jungle tab has a distinct locked visual treatment:

**Desktop (Locked):**

```tsx
<motion.button
  key="jungle"
  onClick={() => {
    if (soundEnabled) playSound('buttonClick')
    trackTabNavigation('jungle')
    setView('jungle')
  }}
  className="relative px-4 py-2 rounded-lg font-bold text-xs tracking-wide transition-all overflow-hidden bg-slate-800/50 text-slate-500 border border-emerald-500/20 hover:border-emerald-500/40 hover:text-emerald-300"
  whileHover={{ y: -1 }}
  whileTap={{ scale: 0.98 }}
>
  <span className="relative flex items-center gap-1.5">
    {/* Lock icon overlaid on jungle icon */}
    <span className="relative">
      {jungleIcon}
      <span className="absolute -bottom-0.5 -right-0.5 text-[8px]">🔒</span>
    </span>
    <span className="hidden xl:inline">Jungle</span>
  </span>
  {/* Subtle green pulse */}
  <motion.div
    className="absolute inset-0 bg-emerald-500/5 rounded-lg"
    animate={{ opacity: [0.05, 0.15, 0.05] }}
    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
  />
</motion.button>
```

**Mobile (Locked):**
Same treatment but with the vertical icon+label layout. The lock emoji renders at 8px overlapping the bottom-right of the jungle icon.

### 3.3 Unlocked Active State

When purchased and selected, the jungle tab uses the `from-emerald-500 to-teal-500` gradient, matching the existing active tab pattern.

When purchased but not selected, it uses the standard inactive styling (`bg-slate-800/50 text-slate-400 border border-slate-700`).

### 3.4 Jungle Mode Context Indicator

When the player is inside an active jungle run (not just on the squad selection screen, but mid-combat), the header receives a subtle contextual change:

**Header Accent:**
The header `border-b` color shifts from `border-slate-700/50` to `border-emerald-500/30`. This is a one-line conditional class change.

**Breadcrumb Bar (Below Header):**
A thin breadcrumb strip appears between the header and main content during an active run:

```tsx
{jungleRun.active && (
  <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-2 text-xs">
    <button
      onClick={confirmExitRun}
      className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors"
    >
      Jungle Run
    </button>
    <span className="text-slate-600">/</span>
    <span className="text-slate-400">
      Stage {jungleRun.currentStage} of 20
    </span>
    <div className="flex-1" />
    <span className="text-emerald-500/60 font-mono text-[10px]">
      Score: {jungleRun.score}
    </span>
  </div>
)}
```

### 3.5 Switching Back to Main Game Mid-Run

Players CAN switch to other tabs (Bait, Collection, etc.) during a jungle run. The run state is preserved. When they return to the Jungle tab, they pick up where they left off.

**Exit Notification:** Clicking a non-jungle tab while in an active run shows a small toast warning (not a modal, to reduce friction):

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: 20 }}
  className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 bg-slate-800 border border-emerald-500/30 rounded-xl shadow-xl text-sm text-emerald-300 font-medium"
>
  Jungle run paused. Return to the Jungle tab to continue.
</motion.div>
```

This toast auto-dismisses after 3 seconds. The run is NOT abandoned by navigating away. Only the explicit "Abandon Run" button in the jungle UI ends a run.

**Hash Routing Addition:**
```typescript
// In store.ts
type View = 'bait' | 'collection' | 'inventory' | 'battle' | 'training' | 'jungle' | 'stats' | 'guide' | 'privacy' | 'terms'
```

In `App.tsx` hash change handler, add `'jungle'` to the valid hash list.

---

## 4. Jungle Theme System

### 4.1 Theme Context Switching

The jungle theme does NOT replace the main game theme globally. Instead, it applies conditionally when `view === 'jungle'`. This is achieved through a class-based context system.

**Approach:** The `<main>` content area receives a conditional wrapper class that overrides CSS custom properties.

```tsx
<main className={`max-w-7xl mx-auto px-6 py-8 relative z-content ${
  view === 'jungle' ? 'jungle-theme' : ''
}`}>
```

### 4.2 Jungle Color Palette

Added to `tailwind.config.js` under `extend.colors`:

```javascript
'jungle': {
  50:  '#f0fdf4',
  100: '#dcfce7',
  200: '#bbf7d0',
  300: '#86efac',
  400: '#4ade80',
  500: '#22c55e',
  600: '#16a34a',
  700: '#15803d',
  800: '#14532d',
  900: '#052e16',
  950: '#022c22',
},
```

**Primary Surfaces:** `bg-jungle-950` (deep jungle black-green, `#022c22`)
**Card Backgrounds:** `bg-jungle-900/80` with `border-emerald-500/20`
**Accent Color:** `emerald-400` for interactive elements, `teal-300` for highlights
**Text Primary:** `text-slate-100` (same as main game)
**Text Secondary:** `text-emerald-200/70`
**Gold Accents:** Reuse `gold-400` / `gold-500` for coins, scores, rare items

Added to `tailwind.config.js` under `extend.boxShadow`:

```javascript
'glow-jungle': '0 0 20px rgba(16, 185, 129, 0.4), 0 0 40px rgba(16, 185, 129, 0.2)',
'glow-jungle-intense': '0 0 30px rgba(16, 185, 129, 0.6), 0 0 60px rgba(16, 185, 129, 0.3)',
```

Added to `extend.backgroundImage`:

```javascript
'jungle-gradient': 'linear-gradient(135deg, #052e16 0%, #022c22 50%, #0f172a 100%)',
'jungle-card-gradient': 'linear-gradient(135deg, rgba(5, 46, 22, 0.8) 0%, rgba(2, 44, 34, 0.9) 100%)',
```

### 4.3 Jungle Animated Background

**New file:** `src/ui/components/JungleBackground.tsx`

Replaces the main `AnimatedBackground` (which uses grid pattern + scanlines) with a layered jungle scene.

**Parallax Layers (back to front):**

1. **Sky Layer (z-0):** Static dark gradient `from-jungle-950 via-emerald-950/80 to-slate-950`. Subtle twinkling stars (same particle pattern as AnimatedBackground but fewer: 6 particles, amber/white colored, slower animation `duration: 15-25s`).

2. **Far Canopy (z-1):** Silhouette of distant jungle treetops. CSS gradient shapes or an SVG image. Very slow horizontal parallax drift (`translateX` animation over 60s, looping). Opacity 0.15.

3. **Mid Canopy (z-2):** Closer tree silhouettes, slightly faster parallax (45s loop). Opacity 0.25. Includes hanging vine shapes (SVG paths with `stroke-dashoffset` animation for subtle swaying).

4. **Mist Layer (z-3):** Two large blurred emerald circles (`bg-emerald-500/8`) that float slowly:

```typescript
animate={{
  x: [-20, 20, -20],
  y: [-10, 15, -10],
  opacity: [0.05, 0.12, 0.05],
}}
transition={{
  duration: 20,
  repeat: Infinity,
  ease: 'easeInOut',
}}
```

5. **Particle Layer (z-4):** Floating spores/fireflies. 8 particles, emerald-400 colored, `width: 2-4px`, with a gentle bobbing animation. Same implementation pattern as existing `AnimatedBackground` particles but green.

6. **Foreground Vines (z-5):** Two decorative vine elements at the left and right edges. Absolute positioned, `opacity: 0.08`. They sway gently:

```typescript
animate={{ rotate: [-1, 1, -1] }}
transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
```

7. **Vignette (z-6):** Same as existing: `radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.5) 100%)`

**Performance:** All layers use CSS transforms only (GPU-accelerated). Particle count kept low (8 vs the existing 12). Parallax uses Framer-Motion `animate` with `repeatType: 'reverse'` to avoid layout thrash.

**Conditional Rendering:**

```tsx
// In App.tsx
<div className="animated-bg">
  {view === 'jungle' ? <JungleBackground /> : null}
</div>
```

The default CSS background from the main game is applied via CSS class and remains when not in jungle mode. `JungleBackground` only mounts when the jungle view is active.

### 4.4 Transition Animation (Main Game <-> Jungle)

When navigating TO the jungle view, the `pageVariants` animation changes:

```typescript
// New variant for jungle entry
export const junglePageVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.95,
    filter: 'brightness(0.5) saturate(0.5)',
  },
  animate: {
    opacity: 1,
    scale: 1,
    filter: 'brightness(1) saturate(1)',
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1],  // custom ease
    },
  },
  exit: {
    opacity: 0,
    scale: 1.05,
    filter: 'brightness(0.5) saturate(0.5)',
    transition: {
      duration: 0.25,
    },
  },
}
```

In `App.tsx`, the motion.div wrapping the main content conditionally uses this variant:

```tsx
<motion.div
  key={view}
  initial="initial"
  animate="animate"
  variants={view === 'jungle' ? junglePageVariants : pageVariants}
>
```

This creates a subtle "warping into the jungle" effect with a brief desaturation-to-saturation transition.

### 4.5 Bird Enemy Card Styling

Bird cards reuse the `GameCard` component but with the following theme overrides:

**Card Border:** Instead of slate-based borders, bird cards use `border-emerald-500/30`.

**Name Badge Gradient:** Birds use tier-based jungle gradients:
```typescript
const BIRD_TIER_GRADIENTS: Record<number, string> = {
  1: 'from-green-600 to-emerald-700',      // Common jungle birds
  2: 'from-teal-500 to-cyan-600',          // Mid-tier
  3: 'from-indigo-500 to-violet-600',       // Advanced
  4: 'from-amber-500 to-orange-600',        // Rare
  5: 'from-red-600 to-rose-700',           // Boss-tier
}
```

**Ability Banner:** Bird ability banners use `border-emerald-500` instead of `border-gold-500`.

**Enemy Indicator:** Birds display a feather icon badge in the top-right: `<span className="text-[10px]">🪶</span>` inside a `bg-emerald-500/80` badge.

### 4.6 Jungle-Specific UI Elements

**Boon Cards:** See Section 7 for full design.

**Stage Progress Bar:** See Section 6.1.

**Score Display:** Emerald-themed counter with `text-emerald-400 font-mono` styling. See Section 6.4.

---

## 5. Squad Selection Screen

### 5.1 JungleRunView -- Squad Selection Phase

**New file:** `src/ui/views/JungleRunView.tsx`

When `junglePassUnlocked === true` and no run is active (`jungleRun.active === false`), the jungle view shows the squad selection interface.

**Layout:**

```
+--------------------------------------------------------------+
|                                                                |
|  [Jungle Hero Banner]                                          |
|  STAR PAWS: JUNGLE RUN                                        |
|  "Select 3 cats for your expedition."                          |
|  text-3xl font-black text-emerald-300                          |
|  text-sm text-slate-400                                        |
|                                                                |
|  [Personal Best: Stage 14 | Score: 2,340]                     |
|  bg-slate-800/50 rounded-lg p-3 border border-emerald-500/20  |
|                                                                |
|  +---------+---------+---------+                               |
|  | SLOT 1  | SLOT 2  | SLOT 3  |   <- Selected squad slots    |
|  | [card]  | [card]  | [empty] |                              |
|  +---------+---------+---------+                               |
|                                                                |
|  [Squad Stats Summary]                                         |
|  Total ATK: 24  |  Total HP: 180  |  Avg Level: 8             |
|                                                                |
|  [Divider: "Your Collection" with sort/filter controls]        |
|                                                                |
|  [Scrollable cat grid - same layout as Collection view]        |
|  Each cat card is tappable to add/remove from squad            |
|  Cards show: name, rarity, level, HP, ATK                      |
|  Low-HP cats show warning indicator                            |
|  Dead cats (0 HP) are grayed out + unselectable                |
|                                                                |
|  [Bottom Action Bar]                                           |
|  [ Enter the Jungle ] (disabled until 3 cats selected)        |
|  [ View Leaderboard ]                                          |
|                                                                |
+--------------------------------------------------------------+
```

### 5.2 Squad Slot Display

Three slots displayed in a horizontal row, centered. Each slot is 140px wide on desktop, full-width/3 on mobile.

**Empty Slot:**

```tsx
<div className="w-full aspect-[2/3] rounded-xl border-2 border-dashed border-emerald-500/30 bg-slate-800/30 flex flex-col items-center justify-center gap-2">
  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
    <span className="text-emerald-500/50 text-xl">+</span>
  </div>
  <p className="text-emerald-500/50 text-xs font-bold">
    Select Cat
  </p>
</div>
```

**Filled Slot:**
Uses a miniaturized version of `GameCard` with `holographicMode="subtle"` and an additional overlay:

```tsx
<div className="relative">
  <GameCard
    character={cat}
    selected={true}
    showStats={true}
    holographicMode="subtle"
  />
  {/* Remove button */}
  <button
    onClick={() => removeFromSquad(cat.instanceId)}
    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg hover:bg-red-400 transition-colors z-20"
    aria-label={`Remove ${cat.name} from squad`}
  >
    x
  </button>
</div>
```

### 5.3 Cat Selection from Collection Grid

The grid reuses the same layout and sorting/filtering UI from `Collection.tsx`. Each cat card's `onClick` toggles selection for the jungle squad.

**Selection Logic:**
- Max 3 cats.
- Tapping a 4th cat when 3 are selected: nothing happens (button appears disabled), brief shake animation on the squad slots.
- Tapping an already-selected cat: removes it from the squad.
- Dead cats (`currentHp <= 0`): grayed out, `disabled={true}`, tooltip says "This cat needs healing first."

### 5.4 Low HP Warning

Cats with HP below 50% of max show a warning overlay:

```tsx
{cat.currentHp < cat.maxHp * 0.5 && cat.currentHp > 0 && (
  <div className="absolute bottom-0 inset-x-0 bg-amber-500/90 text-slate-900 text-[10px] font-bold text-center py-0.5 rounded-b-xl">
    LOW HP: {cat.currentHp}/{cat.maxHp}
  </div>
)}
```

This is a warning only -- players can still select low-HP cats. The roguelike nature means they carry this HP into the run.

### 5.5 Equipment Carry-Over

Equipment equipped on cats in the main game carries into the jungle run. The squad selection screen shows equipped items on each cat card (using the same equipment badges already displayed on `GameCard`).

A note below the squad slots clarifies:

```tsx
<p className="text-slate-500 text-xs text-center mt-2">
  Cats enter the jungle with their current HP and equipped items.
</p>
```

### 5.6 "Enter the Jungle" Confirmation

When 3 cats are selected, the CTA button becomes active:

```tsx
<motion.button
  disabled={selectedSquad.length !== 3}
  onClick={() => setShowConfirmation(true)}
  className={`w-full max-w-sm px-8 py-4 font-black text-lg rounded-xl transition-all ${
    selectedSquad.length === 3
      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-glow-jungle hover:shadow-glow-jungle-intense'
      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
  }`}
  whileHover={selectedSquad.length === 3 ? { scale: 1.03 } : {}}
  whileTap={selectedSquad.length === 3 ? { scale: 0.97 } : {}}
>
  {selectedSquad.length === 3
    ? 'Enter the Jungle'
    : `Select ${3 - selectedSquad.length} more cat${3 - selectedSquad.length !== 1 ? 's' : ''}`}
</motion.button>
```

**Confirmation Modal (Small):**

```tsx
<Modal isOpen={showConfirmation} onClose={() => setShowConfirmation(false)} title="Ready to Enter?" size="sm">
  <div className="text-center py-4">
    <div className="text-4xl mb-3">🌴</div>
    <p className="text-slate-300 text-sm mb-2">
      Your squad will enter the jungle with their current HP.
      There is no healing between stages.
    </p>
    <p className="text-amber-400 text-xs font-bold mb-6">
      If all 3 cats fall, the run ends.
    </p>
    <div className="flex gap-3 justify-center">
      <motion.button
        onClick={startJungleRun}
        className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl shadow-glow-jungle"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        Let's Go!
      </motion.button>
      <motion.button
        onClick={() => setShowConfirmation(false)}
        className="px-6 py-3 bg-slate-700 text-slate-300 font-bold rounded-xl"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        Go Back
      </motion.button>
    </div>
  </div>
</Modal>
```

---

## 6. Active Run UI

### 6.1 Stage Progression Display (HUD)

A persistent HUD bar renders at the top of the jungle content area during an active run.

**Layout (Fixed Top Bar Inside Content):**

```
+--------------------------------------------------------------+
| [Jungle vine border-b, border-emerald-500/20]                |
|                                                                |
| Stage 7/20  [=====--------] 35%   Score: 1,240  [Abandon]    |
|                                                                |
+--------------------------------------------------------------+
```

**Implementation:**

```tsx
<div className="sticky top-0 z-30 bg-jungle-950/95 backdrop-blur-sm border-b border-emerald-500/20 px-4 py-3">
  <div className="flex items-center gap-4">
    {/* Stage Counter */}
    <div className="flex items-center gap-2">
      <span className="text-emerald-400 font-black text-lg">
        Stage {currentStage}
      </span>
      <span className="text-slate-500 text-sm">/20</span>
    </div>

    {/* Progress Bar */}
    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden border border-emerald-500/20">
      <motion.div
        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${(currentStage / 20) * 100}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
      {/* Boss markers at stage 10 and 20 */}
      <div className="relative -mt-2">
        <div className="absolute left-[50%] -translate-x-1/2 w-1 h-3 bg-amber-500 rounded-full" title="Mid-Boss" />
        <div className="absolute right-0 w-1 h-3 bg-red-500 rounded-full" title="Final Boss" />
      </div>
    </div>

    {/* Score */}
    <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
      <span className="text-[10px] text-emerald-500/70 font-bold uppercase">Score</span>
      <span className="text-emerald-300 font-mono font-bold text-sm">
        {score.toLocaleString()}
      </span>
    </div>

    {/* Abandon Run */}
    <button
      onClick={() => setShowAbandonConfirm(true)}
      className="px-3 py-1.5 bg-slate-800 border border-red-500/30 text-red-400 text-xs font-bold rounded-lg hover:bg-red-500/10 transition-colors"
    >
      Abandon
    </button>
  </div>
</div>
```

**Abandon Confirmation:**

```tsx
<Modal isOpen={showAbandonConfirm} onClose={() => setShowAbandonConfirm(false)} title="Abandon Run?" size="sm">
  <div className="text-center py-4">
    <p className="text-slate-300 text-sm mb-4">
      Your current run will be lost. You've cleared {currentStage - 1} stages with a score of {score}.
    </p>
    <div className="flex gap-3 justify-center">
      <motion.button
        onClick={abandonRun}
        className="px-5 py-2.5 bg-red-500 text-white font-bold rounded-lg"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        Abandon Run
      </motion.button>
      <motion.button
        onClick={() => setShowAbandonConfirm(false)}
        className="px-5 py-2.5 bg-slate-700 text-slate-300 font-bold rounded-lg"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        Keep Going
      </motion.button>
    </div>
  </div>
</Modal>
```

### 6.2 Jungle Battle Screen

The battle screen reuses the ENTIRE `BattleArena` component's combat mechanics and layout, but with the following jungle-specific overrides:

**Structural Reuse:**
Create a new wrapper component `JungleBattleArena.tsx` that wraps or adapts `BattleArena` logic. The key differences:

1. **Enemy:** Instead of `DOGS[battleDogIndex]`, use the randomly selected `Bird` for the current stage.
2. **Background:** The jungle background is already rendering (Section 4.3).
3. **No Dog Selection Screen:** The battle starts immediately. No `showDogSelect` phase.
4. **No "Next Battle" button:** Victory leads to the boon picker, not the next dog.
5. **HP Persistence:** Cat HP does NOT reset between stages. `healAllCats` is NOT called.

**Visual Differences:**

- Enemy card position: Same layout (enemy card at top-center, player cards at bottom).
- Enemy HP bar color: `bg-gradient-to-r from-emerald-500 to-teal-400` instead of the current red/orange.
- Battle log text prefix: Bird attacks use feather emoji (`🪶`) instead of dog paw emojis.
- Victory message: "Stage Cleared!" instead of "Victory!"

**Stage Transition (Victory -> Boon -> Next Stage):**

```
Battle Won
  -> 500ms delay
  -> "Stage X Cleared!" mini-celebration (no full modal)
  -> 800ms delay
  -> BoonPickerModal opens (Section 7)
  -> Player picks boon
  -> 400ms transition
  -> Next stage battle begins
```

**Mini-Celebration Between Stages:**

```tsx
<AnimatePresence>
  {showStageClear && (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: -20 }}
      className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
    >
      <div className="text-center">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="text-6xl mb-2"
        >
          🪶
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-3xl font-black text-emerald-300"
        >
          Stage {currentStage} Cleared!
        </motion.h2>
      </div>
    </motion.div>
  )}
</AnimatePresence>
```

This displays for 1200ms, then auto-hides and opens the boon picker.

### 6.3 HP Carry-Over Visual

Since HP carries between stages, the player needs clear visibility into their squad's health.

**Squad HP Strip (Always Visible During Battle):**

Rendered below the stage HUD bar, showing miniature portraits of all 3 cats with HP bars:

```tsx
<div className="flex items-center justify-center gap-4 py-2 px-4 bg-slate-900/50 border-b border-emerald-500/10">
  {squad.map(cat => (
    <div key={cat.ownedCatId} className="flex items-center gap-2">
      {/* Mini portrait */}
      <div className={`w-8 h-8 rounded-full overflow-hidden border-2 ${
        cat.currentHp <= 0
          ? 'border-red-500/50 grayscale opacity-50'
          : cat.currentHp < cat.maxHp * 0.3
            ? 'border-amber-500'
            : 'border-emerald-500/50'
      }`}>
        <img src={catData.imageUrl} alt="" className="w-full h-full object-cover" />
      </div>
      {/* HP bar */}
      <div className="w-16">
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${
              cat.currentHp <= 0
                ? 'bg-red-500'
                : cat.currentHp < cat.maxHp * 0.3
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
            }`}
            animate={{ width: `${Math.max(0, (cat.currentHp / cat.maxHp) * 100)}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <span className="text-[9px] text-slate-500">
          {cat.currentHp}/{cat.maxHp}
        </span>
      </div>
    </div>
  ))}
</div>
```

**Dead Cat Indicator:**
When a cat reaches 0 HP, their portrait gets a red X overlay and grays out. They cannot be selected as attackers. If all 3 cats die, the run ends (Section 9.2).

### 6.4 Run Score Display

Score is always visible in the HUD bar (Section 6.1). It updates in real-time with animated number transitions:

```typescript
// Use a counting animation for score changes
<motion.span
  key={score}
  initial={{ y: -10, opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  className="text-emerald-300 font-mono font-bold text-sm"
>
  {score.toLocaleString()}
</motion.span>
```

### 6.5 Active Boons HUD

See Section 7.5 for the persistent boons display during combat.

---

## 7. Boon Selection Modal

### 7.1 BoonPickerModal

**New file:** `src/ui/components/BoonPickerModal.tsx`

Appears after each stage victory (except after stage 20). Presents 3 randomly selected boons. The player must pick one.

**Modal Properties:**
- NOT dismissable by clicking backdrop or pressing Escape. The player MUST choose.
- Uses a custom modal implementation (not the generic `Modal` component) because there is no close button.
- `size` equivalent: `max-w-2xl`.

### 7.2 Boon Card Layout

Three boon cards are presented in a horizontal "card fan" layout on desktop, or a vertical stack on mobile.

**Desktop Layout (Card Fan):**

```tsx
<div className="flex items-center justify-center gap-4 px-4 py-8">
  {boonOptions.map((boon, index) => (
    <motion.button
      key={boon.id}
      onClick={() => selectBoon(boon)}
      initial={{
        opacity: 0,
        y: 40,
        rotate: index === 0 ? -8 : index === 2 ? 8 : 0,
        scale: 0.9,
      }}
      animate={{
        opacity: 1,
        y: 0,
        rotate: index === 0 ? -5 : index === 2 ? 5 : 0,
        scale: 1,
      }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 20,
        delay: 0.15 * index,
      }}
      whileHover={{
        y: -12,
        rotate: 0,
        scale: 1.05,
        transition: { duration: 0.2 },
      }}
      whileTap={{ scale: 0.97 }}
      className="relative w-48 flex-shrink-0"
    >
      <BoonCard boon={boon} />
    </motion.button>
  ))}
</div>
```

**Mobile Layout (Vertical Stack):**

```tsx
<div className="flex flex-col gap-3 px-4 py-6">
  {boonOptions.map((boon, index) => (
    <motion.button
      key={boon.id}
      onClick={() => selectBoon(boon)}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 * index }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="w-full"
    >
      <BoonCardHorizontal boon={boon} />
    </motion.button>
  ))}
</div>
```

### 7.3 Boon Card Design

**Vertical Card (Desktop):**

```tsx
function BoonCard({ boon }: { boon: Boon }) {
  const rarityColors = {
    common:    { bg: 'from-slate-700 to-slate-800',    border: 'border-slate-500/40', glow: '' },
    rare:      { bg: 'from-blue-800 to-indigo-900',    border: 'border-blue-400/40',  glow: 'shadow-[0_0_15px_rgba(59,130,246,0.3)]' },
    legendary: { bg: 'from-amber-800 to-orange-900',   border: 'border-amber-400/40', glow: 'shadow-[0_0_20px_rgba(245,158,11,0.4)]' },
  }
  const colors = rarityColors[boon.rarity]

  const categoryIcons = {
    offensive: '🗡️',
    defensive: '🛡️',
    utility:   '✨',
  }

  return (
    <div className={`relative rounded-xl overflow-hidden border-2 ${colors.border} ${colors.glow} bg-gradient-to-br ${colors.bg} p-4`}>
      {/* Category Icon */}
      <div className="text-3xl text-center mb-2">
        {categoryIcons[boon.category]}
      </div>

      {/* Rarity Badge */}
      <div className="flex justify-center mb-2">
        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
          boon.rarity === 'legendary' ? 'bg-amber-500/30 text-amber-300' :
          boon.rarity === 'rare' ? 'bg-blue-500/30 text-blue-300' :
          'bg-slate-500/30 text-slate-300'
        }`}>
          {boon.rarity}
        </span>
      </div>

      {/* Name */}
      <h4 className="text-white font-black text-sm text-center uppercase tracking-wide mb-2">
        {boon.name}
      </h4>

      {/* Description */}
      <p className="text-slate-300 text-xs text-center leading-relaxed">
        {boon.description}
      </p>

      {/* Stackable indicator */}
      {boon.stackable && (
        <p className="text-emerald-400/60 text-[10px] text-center mt-2 font-bold">
          Stackable
        </p>
      )}
    </div>
  )
}
```

**Horizontal Card (Mobile):**

```tsx
function BoonCardHorizontal({ boon }: { boon: Boon }) {
  // Same color logic as above
  return (
    <div className={`flex items-center gap-3 rounded-xl border-2 ${colors.border} ${colors.glow} bg-gradient-to-r ${colors.bg} p-3`}>
      <div className="text-2xl flex-shrink-0">
        {categoryIcons[boon.category]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h4 className="text-white font-black text-sm uppercase tracking-wide truncate">
            {boon.name}
          </h4>
          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${rarityClass}`}>
            {boon.rarity}
          </span>
        </div>
        <p className="text-slate-300 text-xs leading-snug">
          {boon.description}
        </p>
      </div>
    </div>
  )
}
```

### 7.4 Selection Animation

When a boon is selected:

1. **Selected card** pulses with a bright border glow and scales up slightly:
```typescript
animate={{ scale: 1.1, boxShadow: '0 0 30px rgba(16, 185, 129, 0.6)' }}
transition={{ duration: 0.2 }}
```

2. **Unselected cards** fade out and slide away:
```typescript
animate={{ opacity: 0, x: index < selectedIndex ? -60 : 60, scale: 0.8 }}
transition={{ duration: 0.3 }}
```

3. **After 600ms:** The selected boon card flips (rotateY: 180 -> 0) into a small "Boon Acquired!" confirmation:

```tsx
<motion.div
  initial={{ rotateY: 90, opacity: 0 }}
  animate={{ rotateY: 0, opacity: 1 }}
  transition={{ delay: 0.4, duration: 0.3 }}
  className="text-center py-4"
>
  <span className="text-4xl">{categoryIcons[boon.category]}</span>
  <h3 className="text-emerald-300 font-black text-lg mt-2">{boon.name}</h3>
  <p className="text-slate-400 text-xs mt-1">Added to your active boons</p>
</motion.div>
```

4. **After 1200ms total:** Modal auto-closes and the next stage begins.

### 7.5 Active Boons HUD (During Run)

A collapsible boon strip renders below the squad HP strip:

**Collapsed State (Default):**

```tsx
<button
  onClick={() => setBoonsExpanded(!boonsExpanded)}
  className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 border border-emerald-500/10 rounded-lg"
>
  {/* Mini boon icons */}
  <div className="flex -space-x-1">
    {activeBoons.slice(0, 5).map(boon => (
      <div
        key={boon.id}
        className={`w-5 h-5 rounded-full border ${
          boon.rarity === 'legendary' ? 'border-amber-500 bg-amber-500/20' :
          boon.rarity === 'rare' ? 'border-blue-500 bg-blue-500/20' :
          'border-slate-500 bg-slate-500/20'
        } flex items-center justify-center text-[8px]`}
      >
        {categoryIcons[boon.category]}
      </div>
    ))}
    {activeBoons.length > 5 && (
      <div className="w-5 h-5 rounded-full border border-slate-500 bg-slate-700 flex items-center justify-center text-[8px] text-slate-400">
        +{activeBoons.length - 5}
      </div>
    )}
  </div>
  <span className="text-emerald-500/70 text-[10px] font-bold">
    {activeBoons.length} Boons
  </span>
  <span className="text-slate-500 text-[10px]">
    {boonsExpanded ? '▲' : '▼'}
  </span>
</button>
```

**Expanded State:**

```tsx
<AnimatePresence>
  {boonsExpanded && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="overflow-hidden"
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-slate-800/30 rounded-lg border border-emerald-500/10 mt-1">
        {activeBoons.map(boon => (
          <div
            key={boon.id}
            className={`px-2 py-1.5 rounded-lg border ${rarityBorder} text-xs`}
          >
            <span className="font-bold text-white">{boon.name}</span>
            {boon.stacks > 1 && (
              <span className="text-emerald-400 ml-1">x{boon.stacks}</span>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  )}
</AnimatePresence>
```

### 7.6 Stacked Boon Indicators

When a stackable boon is picked again, the existing boon icon in the HUD gains a stack counter:

```tsx
<div className="relative">
  {/* Boon icon */}
  {boon.stacks > 1 && (
    <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[7px] font-black rounded-full w-3.5 h-3.5 flex items-center justify-center">
      {boon.stacks}
    </span>
  )}
</div>
```

This uses the same badge pattern as the notification dots throughout the app.

---

## 8. Boss Encounters

### 8.1 Boss Introduction Screen (Stage 10 & 20)

When entering a boss stage, instead of the battle starting immediately, a special introduction sequence plays:

**Stage 10 -- Apex Raptor:**

```
+--------------------------------------------------------------+
| [Full-screen overlay, bg-slate-950/95]                        |
|                                                                |
|         [Dramatic red/amber vignette edges]                    |
|                                                                |
|              BOSS ENCOUNTER                                    |
|         text-sm text-amber-500 tracking-[0.3em]               |
|                                                                |
|              [Boss art / card]                                 |
|              Larger than normal: w-64 h-96                     |
|              Animated entrance: rise from below                |
|                                                                |
|              APEX RAPTOR                                        |
|         text-4xl font-black text-amber-400                     |
|              "The jungle's alpha predator."                     |
|              text-slate-400 text-sm                             |
|                                                                |
|              Special: Abilities rotate each turn               |
|              bg-amber-500/10 border border-amber-500/30        |
|              rounded-lg px-4 py-2                              |
|                                                                |
|         [   Face the Apex Raptor   ]                           |
|         bg-gradient-to-r from-amber-500 to-red-500            |
|                                                                |
+--------------------------------------------------------------+
```

**Animation Sequence:**

```typescript
// Background vignette pulses
animate={{ opacity: [0.3, 0.6, 0.3] }}
transition={{ duration: 2, repeat: Infinity }}

// "BOSS ENCOUNTER" text
initial={{ opacity: 0, letterSpacing: '0.5em' }}
animate={{ opacity: 1, letterSpacing: '0.3em' }}
transition={{ duration: 0.8 }}

// Boss card rises from below
initial={{ opacity: 0, y: 100, scale: 0.8 }}
animate={{ opacity: 1, y: 0, scale: 1 }}
transition={{ type: 'spring', stiffness: 120, damping: 20, delay: 0.5 }}

// Boss name
initial={{ opacity: 0, scale: 0.9 }}
animate={{ opacity: 1, scale: 1 }}
transition={{ delay: 0.8, duration: 0.4 }}

// CTA button
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ delay: 1.2 }}
```

**Sound:** Play a deep jungle drums + raptor screech sound effect (2s).

**Stage 20 -- The Feathered King:**

Same structure but more dramatic:
- Red vignette instead of amber.
- Additional screen shake on entrance: `animate={{ x: [-2, 2, -2, 0] }}` for 0.4s.
- Title uses animated gradient text: `bg-gradient-to-r from-red-500 via-amber-400 to-red-500 bg-clip-text text-transparent`.
- Subtitle: "Ruler of the sky. All will bow."
- Special ability note: "Phase shifts at 50% and 25% HP with new movesets."

### 8.2 Boss HP Bar Treatment

**Single-Phase Bosses (Apex Raptor):**

Standard HP bar but wider and with amber color:

```tsx
<div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden border-2 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.3)]">
  <motion.div
    className="h-full bg-gradient-to-r from-amber-500 to-red-500 rounded-full"
    animate={{ width: `${(bossHp / bossMaxHp) * 100}%` }}
    transition={{ duration: 0.3, ease: 'easeOut' }}
  />
</div>
<div className="text-center mt-1">
  <span className="text-amber-400 font-bold text-sm">{bossHp}</span>
  <span className="text-slate-500 text-xs"> / {bossMaxHp}</span>
</div>
```

**Multi-Phase Boss (The Feathered King):**

The HP bar shows phase markers at 50% and 25%:

```tsx
<div className="relative w-full h-4 bg-slate-800 rounded-full overflow-hidden border-2 border-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.3)]">
  {/* HP fill */}
  <motion.div
    className={`h-full rounded-full ${
      currentPhase === 3 ? 'bg-gradient-to-r from-red-600 to-rose-500' :
      currentPhase === 2 ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
      'bg-gradient-to-r from-emerald-500 to-teal-400'
    }`}
    animate={{ width: `${(bossHp / bossMaxHp) * 100}%` }}
    transition={{ duration: 0.3 }}
  />

  {/* Phase markers */}
  <div className="absolute top-0 left-[50%] w-0.5 h-full bg-white/30" />
  <div className="absolute top-0 left-[25%] w-0.5 h-full bg-white/30" />
</div>

{/* Phase indicator */}
<div className="text-center mt-1">
  <span className="text-xs font-bold uppercase tracking-wider">
    {currentPhase === 3 && <span className="text-red-400">FINAL PHASE</span>}
    {currentPhase === 2 && <span className="text-amber-400">PHASE 2</span>}
    {currentPhase === 1 && <span className="text-emerald-400">PHASE 1</span>}
  </span>
</div>
```

**Phase Transition Animation:**

When a phase threshold is crossed, a brief dramatic pause occurs:

```typescript
// 800ms freeze during phase transition
// Screen flashes the new phase color
animate={{
  backgroundColor: ['transparent', 'rgba(239, 68, 68, 0.15)', 'transparent'],
}}
transition={{ duration: 0.8 }}

// Boss card shakes
animate={{ x: [-4, 4, -4, 4, 0], rotate: [-2, 2, -2, 2, 0] }}
transition={{ duration: 0.5 }}

// Phase announcement text
// "PHASE 2: New Abilities Unlocked!"
initial={{ opacity: 0, scale: 1.5 }}
animate={{ opacity: [0, 1, 1, 0], scale: [1.5, 1, 1, 0.9] }}
transition={{ duration: 1.2, times: [0, 0.2, 0.8, 1] }}
```

### 8.3 Visual Escalation

Each boss phase increases the visual intensity:

**Phase 1 (100%-50% HP):**
- Normal jungle background.
- Standard particles.
- HP bar: emerald gradient.

**Phase 2 (50%-25% HP):**
- Background mist turns amber-tinted (`bg-amber-500/5`).
- Particles increase speed by 1.5x.
- HP bar: amber/orange gradient.
- Boss card gains a pulsing amber glow: `shadow-[0_0_20px_rgba(245,158,11,0.3)]`.
- Battle log messages for boss attacks render in amber.

**Phase 3 (25%-0% HP):**
- Background mist turns red-tinted (`bg-red-500/5`).
- Particles increase speed by 2x, color shifts to red.
- HP bar: red/rose gradient.
- Boss card gains intense red glow: `shadow-[0_0_30px_rgba(239,68,68,0.4)]` with `animate-pulse`.
- Screen subtly shakes every 3 boss attacks.

---

## 9. Run End Screens

### 9.1 Victory Screen (Stage 20 Cleared)

**New file:** `src/ui/components/JungleVictoryModal.tsx`

Full-screen celebration modal. Uses the same portal-based rendering as `CatchCelebrationModal`.

**Animation Sequence (2500ms):**

1. **0ms:** Background dims to `bg-slate-950/95`. `ParticleSystem` fires with emerald + gold particles (count: 40).
2. **200ms:** Crown icon drops in with spring animation.
3. **400ms:** "JUNGLE CONQUERED!" text with animated gradient.
4. **700ms:** Score breakdown fades in with staggered items.
5. **1200ms:** Reward cards slide in from bottom.
6. **1800ms:** Action buttons fade in.

**Layout:**

```
+--------------------------------------------------------------+
| [bg-slate-950/95 backdrop-blur-xl]                            |
| [ParticleSystem: 40 particles, emerald + gold]                |
|                                                                |
|                    [Crown icon 7xl]                            |
|                                                                |
|               JUNGLE CONQUERED!                                |
|     text-4xl font-black bg-gradient-to-r                      |
|     from-emerald-300 via-gold-300 to-emerald-300              |
|     bg-clip-text text-transparent                              |
|                                                                |
|  +-----------------------------------------------------+      |
|  | SCORE BREAKDOWN                                      |      |
|  | bg-slate-800/50 rounded-xl border border-gold-500/30 |      |
|  |                                                       |      |
|  | Stages Cleared: 20/20              +2,000             |      |
|  | Remaining HP Bonus:                +340               |      |
|  | Speed Bonus:                       +200               |      |
|  | Boons Collected: 19                +190               |      |
|  | All Cats Alive Bonus:              +500               |      |
|  |                                                       |      |
|  | TOTAL SCORE        text-3xl        2,730              |      |
|  | font-black text-gold-400                              |      |
|  +-----------------------------------------------------+      |
|                                                                |
|  [Rewards Earned]                                              |
|  +---------------+  +---------------+  +---------------+      |
|  | Feathered     |  | Talon Blade   |  | Jungle Crown* |      |
|  | Collar        |  |               |  | *if all alive  |      |
|  | [item art]    |  | [item art]    |  | [item art]    |      |
|  +---------------+  +---------------+  +---------------+      |
|                                                                |
|  [Leaderboard Position]                                        |
|  "You ranked #7 on the Jungle Leaderboard!"                   |
|                                                                |
|  [ Play Again ]           [ Share Score ]                      |
|  from-emerald-500          from-purple-500                     |
|  to-teal-500               to-pink-500                         |
|                                                                |
|  [ Back to Menu ]                                              |
|  text-slate-400                                                |
|                                                                |
+--------------------------------------------------------------+
```

**Score Breakdown Animation:**

Each line item animates in with a 0.1s stagger:

```typescript
initial={{ opacity: 0, x: -10 }}
animate={{ opacity: 1, x: 0 }}
transition={{ delay: 0.7 + index * 0.1 }}
```

The total score counts up from 0 to the final value over 1.5s:

```typescript
// Use a counting animation
const [displayScore, setDisplayScore] = useState(0)
useEffect(() => {
  let start = 0
  const end = totalScore
  const duration = 1500
  const startTime = Date.now()

  const tick = () => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3) // easeOutCubic
    setDisplayScore(Math.floor(eased * end))
    if (progress < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}, [totalScore])
```

### 9.2 Defeat Screen (Squad Wiped)

**Layout:**

```
+--------------------------------------------------------------+
| [Modal: size="sm"]                                             |
| title="EXPEDITION FAILED"                                      |
|                                                                |
|                    [Skull icon 6xl]                             |
|                                                                |
|             Your squad has fallen.                              |
|     text-xl font-bold text-red-400                              |
|                                                                |
|     You survived {stagesCleared} stages.                        |
|                                                                |
|  +--------------------------------------------------+          |
|  | Run Summary                                       |          |
|  | bg-slate-800/50 border border-emerald-500/20      |          |
|  |                                                    |          |
|  | Stages Cleared: 7/20                               |          |
|  | Score: 1,240                                       |          |
|  | Boons Collected: 6                                 |          |
|  | Best Cat Standing: Whisker (fell at Stage 7)       |          |
|  +--------------------------------------------------+          |
|                                                                |
|  [ Try Again ]              [ Back to Menu ]                   |
|  from-emerald-500            bg-slate-700                       |
|  to-teal-500                                                    |
|                                                                |
+--------------------------------------------------------------+
```

**Sound:** Play the existing `defeat` sound effect (same as main game defeat).

"Try Again" returns to the squad selection screen. "Back to Menu" navigates to the jungle view's idle state (squad selection).

### 9.3 Reward Unlock Animations

When a reward is earned for the first time, each reward card plays its own mini-celebration:

**Reward Card:**

```tsx
<motion.div
  initial={{ opacity: 0, y: 30, rotateY: 90 }}
  animate={{ opacity: 1, y: 0, rotateY: 0 }}
  transition={{ type: 'spring', stiffness: 180, damping: 18, delay: 1.2 + index * 0.2 }}
  className="p-4 rounded-xl bg-gradient-to-br from-emerald-900/80 to-teal-900/80 border border-gold-500/40 shadow-glow-gold text-center"
>
  <div className="text-3xl mb-2">{reward.icon}</div>
  <h4 className="text-gold-400 font-black text-sm uppercase tracking-wider">
    {reward.name}
  </h4>
  <p className="text-slate-400 text-xs mt-1">
    {reward.description}
  </p>
  {!reward.previouslyUnlocked && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.8 + index * 0.2 }}
      className="mt-2 px-2 py-0.5 bg-emerald-500/20 rounded text-emerald-300 text-[10px] font-bold"
    >
      NEW UNLOCK!
    </motion.div>
  )}
</motion.div>
```

**Special Animation for Jungle Crown (All Cats Alive):**

The Jungle Crown reward has an enhanced reveal: the card starts with a pulsing golden glow, then "crowns" the player's best cat portrait. A brief confetti burst (ParticleSystem, gold particles, count: 20) fires when this card reveals.

### 9.4 Share Score Functionality

The "Share Score" button generates a shareable text string and copies it to the clipboard:

```typescript
const shareText = `I conquered the Jungle in Star Paws: Jungle Run!\n\nScore: ${totalScore.toLocaleString()}\nStages: ${stagesCleared}/20\nAll Cats Alive: ${allAlive ? 'Yes!' : 'No'}\n\nCan you beat my score? Play Whisker Wars!`

navigator.clipboard.writeText(shareText)
```

After copying, the button text changes to "Copied!" with a checkmark for 2 seconds, then reverts.

If `navigator.share` is available (mobile), use the Web Share API instead:

```typescript
if (navigator.share) {
  navigator.share({
    title: 'Star Paws: Jungle Run',
    text: shareText,
  })
}
```

---

## 10. Jungle Leaderboard

### 10.1 Integration with StatsView

The existing `StatsView` has a `tab` state switching between `'stats'` and `'leaderboard'`. Extend the leaderboard section with jungle-specific categories.

**Add Jungle Leaderboard Category Tabs:**

Within the leaderboard view, add a sub-tab row:

```tsx
<div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
  {[
    { id: 'totalWins', label: 'Battle Wins' },
    { id: 'highestDog', label: 'Highest Dog' },
    { id: 'jungleBestScore', label: 'Jungle Score', locked: !junglePassUnlocked },
    { id: 'jungleHighestStage', label: 'Jungle Stage', locked: !junglePassUnlocked },
    { id: 'jungleFastestClear', label: 'Fastest Clear', locked: !junglePassUnlocked },
  ].map(cat => (
    <button
      key={cat.id}
      onClick={() => !cat.locked && setLeaderboardCategory(cat.id as LeaderboardCategory)}
      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
        cat.locked
          ? 'bg-slate-800/30 text-slate-600 cursor-not-allowed'
          : leaderboardCategory === cat.id
            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-slate-600'
      }`}
    >
      {cat.locked && <span className="mr-1">🔒</span>}
      {cat.label}
    </button>
  ))}
</div>
```

**Locked Category Message:**

When a non-purchaser clicks a locked jungle leaderboard tab:

```tsx
<div className="text-center py-12">
  <div className="text-4xl mb-3">🌴</div>
  <h3 className="text-lg font-bold text-white mb-2">
    Jungle Run Leaderboard
  </h3>
  <p className="text-slate-400 text-sm mb-4 max-w-xs mx-auto">
    Unlock the Star Paws: Jungle Run expansion to compete on the jungle leaderboard.
  </p>
  <motion.button
    onClick={() => setView('jungle')}
    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm rounded-lg"
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
  >
    Learn More
  </motion.button>
</div>
```

### 10.2 Jungle Stats Display

When the player has purchased the expansion, the "stats" tab in StatsView gains a "Jungle Run" section:

```tsx
{junglePassUnlocked && (
  <div className="mt-8">
    <h3 className="text-lg font-black text-emerald-300 mb-4 flex items-center gap-2">
      <span>🌴</span> Jungle Run Stats
    </h3>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCard label="Best Score" value={jungleStats.bestScore.toLocaleString()} color="text-emerald-400" />
      <StatCard label="Highest Stage" value={`${jungleStats.highestStage}/20`} color="text-teal-400" />
      <StatCard label="Total Runs" value={jungleStats.totalRuns} color="text-cyan-400" />
      <StatCard label="Fastest Clear" value={jungleStats.fastestClear ? `${jungleStats.fastestClear}m` : '--'} color="text-gold-400" />
    </div>
  </div>
)}
```

**StatCard Component:**

```tsx
<div className="p-3 rounded-xl bg-slate-800/50 border border-emerald-500/20">
  <div className={`text-2xl font-black ${color}`}>{value}</div>
  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mt-0.5">{label}</div>
</div>
```

---

## 11. Rewards in Main Game

### 11.1 Cosmetic Equipment Display on Cat Cards

Jungle rewards (Feathered Collar, Talon Blade, Jungle Crown) are equipment items that display on cat cards in the Collection and Battle views.

**Equipment Badge on GameCard:**

Extend the existing GameCard component to show cosmetic equipment badges. These render above the ability banner at the bottom of the card:

```tsx
{/* Jungle Cosmetic Badges */}
{cat.equipment?.cosmetic && (
  <div className="absolute top-2 left-2 z-20 flex gap-1">
    {cat.equipment.cosmetic === 'feathered-collar' && (
      <div className="px-1.5 py-0.5 rounded bg-emerald-500/80 border border-emerald-300/50 shadow-sm">
        <span className="text-[8px] font-black text-white">🪶</span>
      </div>
    )}
    {cat.equipment.cosmetic === 'talon-blade' && (
      <div className="px-1.5 py-0.5 rounded bg-amber-500/80 border border-amber-300/50 shadow-sm">
        <span className="text-[8px] font-black text-white">🗡️</span>
      </div>
    )}
    {cat.equipment.cosmetic === 'jungle-crown' && (
      <div className="px-1.5 py-0.5 rounded bg-gradient-to-r from-gold-500 to-amber-500 border border-gold-300/50 shadow-glow-gold">
        <span className="text-[8px] font-black text-slate-900">👑</span>
      </div>
    )}
  </div>
)}
```

**Jungle Crown Special Effect:**

The Jungle Crown adds a persistent animated glow to the card:

```css
/* In global CSS */
.jungle-crown-glow {
  animation: jungle-crown-pulse 3s ease-in-out infinite;
}

@keyframes jungle-crown-pulse {
  0%, 100% { box-shadow: 0 0 10px rgba(16, 185, 129, 0.2), 0 0 20px rgba(234, 179, 8, 0.1); }
  50% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.4), 0 0 40px rgba(234, 179, 8, 0.2); }
}
```

### 11.2 Profile Badge / Title Display

**In StatsView Profile Section:**

```tsx
{/* Jungle Badges */}
{jungleStats.badgesEarned.includes('jungle-survivor') && (
  <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 mr-2 mb-2">
    <span className="text-xs">🌴</span>
    <span className="text-[10px] font-bold text-emerald-400">Jungle Survivor</span>
  </div>
)}
{jungleStats.badgesEarned.includes('apex-predator') && (
  <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gradient-to-r from-amber-500/10 to-red-500/10 border border-amber-500/30 mr-2 mb-2">
    <span className="text-xs">🦅</span>
    <span className="text-[10px] font-bold text-amber-400">Apex Predator</span>
  </div>
)}
```

**On Leaderboard Entries:**

Leaderboard entries for players who own the expansion show a small jungle leaf icon next to their name:

```tsx
{entry.junglePassOwned && (
  <span className="text-emerald-400 text-xs ml-1" title="Jungle Run owner">🌿</span>
)}
```

### 11.3 Visual Source Indicator

Rewards from the jungle mode are distinguished from main-game rewards in the Inventory view with a "Jungle" origin badge:

```tsx
{item.source === 'jungle' && (
  <span className="absolute top-1 right-1 px-1 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-[7px] font-bold text-emerald-400 uppercase">
    Jungle
  </span>
)}
```

---

## 12. Accessibility & Polish

### 12.1 Loading States

Every async operation in the jungle flow has an explicit loading state:

| Operation | Loading UI |
|-----------|-----------|
| Creating checkout session | Spinner + "Preparing secure checkout..." |
| Processing payment | Spinner + "Processing payment..." + "Please don't close this window." |
| Starting jungle run | Brief skeleton pulse on battle area (200ms) |
| Fetching jungle leaderboard | Spinner within the leaderboard container (same as existing `leaderboardLoading` state) |
| Submitting score | "Submitting score..." toast at bottom of victory screen |

**Spinner Component (reusable):**

```tsx
function JungleSpinner({ size = 'md', label }: { size?: 'sm' | 'md' | 'lg'; label?: string }) {
  const sizes = { sm: 'w-6 h-6', md: 'w-10 h-10', lg: 'w-14 h-14' }
  return (
    <div className="flex flex-col items-center gap-2">
      <motion.div
        className={`${sizes[size]} border-3 border-emerald-500/30 border-t-emerald-500 rounded-full`}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
      {label && <p className="text-slate-400 text-sm">{label}</p>}
    </div>
  )
}
```

### 12.2 Error States

**Network Error During Payment:**

```tsx
<div className="text-center py-6">
  <div className="text-4xl mb-3">📡</div>
  <h3 className="text-lg font-bold text-red-400 mb-2">Connection Error</h3>
  <p className="text-slate-400 text-sm mb-4">
    Could not connect to the payment server. Please check your internet connection and try again.
  </p>
  <button onClick={retryCheckout} className="...">Retry</button>
</div>
```

**Leaderboard Fetch Failure:**

```tsx
<div className="text-center py-8">
  <p className="text-slate-500 text-sm">Could not load leaderboard. Pull to refresh.</p>
</div>
```

**Run State Corruption:**

If a jungle run state is detected as invalid (e.g., `currentStage > 20` or `squad` is empty while `active === true`), automatically reset the run state and show:

```tsx
<div className="text-center py-8">
  <div className="text-4xl mb-3">🛠️</div>
  <p className="text-slate-300 text-sm mb-2">Your jungle run encountered an issue and was reset.</p>
  <p className="text-slate-500 text-xs">Your cats are unharmed. Start a new run to continue.</p>
</div>
```

### 12.3 Offline Handling

**During Checkout:**
Peach Payments requires network. If offline, show the network error state (12.2) immediately when the player clicks "Unlock".

**During Gameplay:**
Jungle runs are fully client-side. Offline play works for the run itself. Score submission to the leaderboard is queued and retried when connectivity returns (using the same pattern as existing cloud save retry logic).

**Offline Indicator:**
If `navigator.onLine === false` while in jungle mode:

```tsx
<div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] px-3 py-1.5 bg-amber-500/90 text-slate-900 text-xs font-bold rounded-lg">
  Offline -- scores will submit when reconnected
</div>
```

### 12.4 Animation Preferences (Reduced Motion)

All Framer-Motion animations respect `prefers-reduced-motion`. Add a global check:

```typescript
// src/utils/motion.ts
export const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Usage in animation configs:
export const junglePageVariants: Variants = prefersReducedMotion
  ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
  : { /* full animation config */ }
```

**Reduced-motion behavior:**
- Page transitions: instant opacity fade (100ms).
- Parallax background: static (no movement), reduced to just the gradient + vignette.
- Particle systems: disabled entirely.
- Card fan / boon selection: simple opacity transitions, no rotation or y-offset.
- Boss introduction: skip the dramatic sequence, go directly to the CTA button.
- Score counter: instant display, no counting animation.
- Phase transitions: skip shake/flash, just update the HP bar color.

### 12.5 Mobile Touch Targets

All interactive elements in jungle mode maintain a minimum touch target of 44x44px (WCAG 2.5.5):

- Tab bar buttons: already `px-3 py-3` with `flex-1`, well above 44px.
- Boon selection cards: full-width on mobile (horizontal layout), minimum 48px tall.
- Squad selection cat cards: 140px+ wide, 200px+ tall.
- Abandon/action buttons: `px-3 py-1.5` minimum, with generous hit areas.
- Close buttons: `p-2` (40px) -- slightly under 44px but consistent with existing Modal close button.

### 12.6 Keyboard Navigation

- Boon selection modal: arrow keys to highlight boons, Enter/Space to select.
- Squad selection: Tab cycles through available cats, Space toggles selection.
- All modals: Escape to close (except boon picker, which requires a selection).
- Stage HUD: no keyboard interaction needed (display only).

### 12.7 Screen Reader Announcements

- `aria-live="polite"` region for stage transitions: "Stage 5 cleared. Select a boon to continue."
- Boss introduction: `aria-label` on the boss card describing the boss name and abilities.
- Boon cards: `aria-label` with full boon name, rarity, and description.
- Score display: `aria-label="Current score: 1,240"`.
- HP carry-over strip: each cat portrait has `aria-label="${catName}: ${currentHp} of ${maxHp} HP"`.

### 12.8 z-Index Layering

Using the existing z-index scale from `tailwind.config.js`:

| Element | z-Index Token | Value |
|---------|--------------|-------|
| Jungle background layers | `z-bg` | 0 |
| Stage content | `z-content` | 10 |
| Stage HUD (progress bar) | `z-card-overlay` | 20 |
| Header | `z-header` | 40 |
| Boon picker / modals | `z-modal` | 90 |
| Boss intro overlay | `z-celebration` | 70 |
| Victory/defeat modal | `z-celebration` | 70 |
| Purchase celebration | `z-critical` | 100 |
| Toast notifications | `z-critical` | 100 |

---

## Appendix: Component File Map

| File | New/Modify | Purpose |
|------|-----------|---------|
| `src/ui/views/JungleRunView.tsx` | New | Main jungle view: squad selection + active run routing |
| `src/ui/components/JungleBackground.tsx` | New | Parallax jungle animated background |
| `src/ui/components/JungleAnnouncementModal.tsx` | New | One-time expansion announcement popup |
| `src/ui/components/JunglePreviewModal.tsx` | New | Marketing/purchase gate modal |
| `src/ui/components/JungleUnlockCelebration.tsx` | New | Post-purchase celebration screen |
| `src/ui/components/JungleBattleArena.tsx` | New | Jungle-themed battle wrapper |
| `src/ui/components/BoonPickerModal.tsx` | New | Between-stage boon selection |
| `src/ui/components/BoonCard.tsx` | New | Boon card display (vertical + horizontal) |
| `src/ui/components/BossIntroScreen.tsx` | New | Boss encounter introduction |
| `src/ui/components/JungleVictoryModal.tsx` | New | Run completion / game over screen with score |
| `src/ui/components/JungleDefeatModal.tsx` | New | Run failure screen |
| `src/ui/components/JungleSpinner.tsx` | New | Jungle-themed loading spinner |
| `src/ui/components/StageHUD.tsx` | New | In-run progress bar / score / boons strip |
| `src/ui/components/SquadHPStrip.tsx` | New | Mini HP bars for squad during battle |
| `src/ui/App.tsx` | Modify | Add jungle tab, jungle view routing, announcement modal |
| `src/ui/animations.ts` | Modify | Add `junglePageVariants`, boss animation variants |
| `src/ui/components/EventBanner.tsx` | Modify | Add jungle promo banner |
| `src/ui/views/StatsView.tsx` | Modify | Add jungle stats section + leaderboard categories |
| `src/ui/components/GameCard.tsx` | Modify | Add jungle cosmetic badge rendering |
| `src/ui/views/Collection.tsx` | Modify | Show jungle cosmetics on cards |
| `src/ui/components/Modal.tsx` | No change | Reused as-is |
| `src/ui/constants/rarity.ts` | No change | Reused for cat cards in jungle |
| `tailwind.config.js` | Modify | Add jungle colors, shadows, gradients |
| `src/game/store.ts` | Modify | Add `junglePassUnlocked`, `jungleRun` state, and actions |
| `src/utils/motion.ts` | New | Reduced-motion detection utility |

---

## Appendix: Framer-Motion Animation Reference

All animation configs gathered in one place for implementation reference.

```typescript
// src/ui/animations.ts (additions)

// Jungle page entry
export const junglePageVariants: Variants = {
  initial: { opacity: 0, scale: 0.95, filter: 'brightness(0.5) saturate(0.5)' },
  animate: {
    opacity: 1, scale: 1, filter: 'brightness(1) saturate(1)',
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
  },
  exit: {
    opacity: 0, scale: 1.05, filter: 'brightness(0.5) saturate(0.5)',
    transition: { duration: 0.25 },
  },
}

// Boon card fan entrance
export const boonFanVariants = (index: number): Variants => ({
  hidden: { opacity: 0, y: 40, rotate: index === 0 ? -8 : index === 2 ? 8 : 0, scale: 0.9 },
  show: {
    opacity: 1, y: 0, rotate: index === 0 ? -5 : index === 2 ? 5 : 0, scale: 1,
    transition: { type: 'spring', stiffness: 200, damping: 20, delay: 0.15 * index },
  },
  hover: { y: -12, rotate: 0, scale: 1.05, transition: { duration: 0.2 } },
  tap: { scale: 0.97 },
})

// Boss entrance
export const bossEntranceVariants: Variants = {
  hidden: { opacity: 0, y: 100, scale: 0.8 },
  show: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring', stiffness: 120, damping: 20, delay: 0.5 },
  },
}

// Boss phase transition
export const phaseTransitionVariants: Variants = {
  idle: { x: 0, rotate: 0 },
  shake: {
    x: [-4, 4, -4, 4, 0],
    rotate: [-2, 2, -2, 2, 0],
    transition: { duration: 0.5 },
  },
}

// Stage clear celebration
export const stageClearVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8, y: 20 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 18 } },
  exit: { opacity: 0, scale: 0.8, y: -20, transition: { duration: 0.3 } },
}

// Victory crown entrance
export const crownDropVariants: Variants = {
  hidden: { opacity: 0, y: -60, scale: 0.5, rotate: -20 },
  show: {
    opacity: 1, y: 0, scale: 1, rotate: 0,
    transition: { type: 'spring', stiffness: 180, damping: 14, delay: 0.2 },
  },
}

// Score count-up (utility hook, not a variant)
export function useCountUp(target: number, duration: number = 1500) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const startTime = Date.now()
    const tick = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.floor(eased * target))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration])
  return value
}
```

---

## Appendix: Tailwind Configuration Additions

```javascript
// tailwind.config.js additions to extend
{
  colors: {
    'jungle': {
      50:  '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#14532d',
      900: '#052e16',
      950: '#022c22',
    },
  },
  boxShadow: {
    'glow-jungle': '0 0 20px rgba(16, 185, 129, 0.4), 0 0 40px rgba(16, 185, 129, 0.2)',
    'glow-jungle-intense': '0 0 30px rgba(16, 185, 129, 0.6), 0 0 60px rgba(16, 185, 129, 0.3)',
  },
  backgroundImage: {
    'jungle-gradient': 'linear-gradient(135deg, #052e16 0%, #022c22 50%, #0f172a 100%)',
    'jungle-card-gradient': 'linear-gradient(135deg, rgba(5, 46, 22, 0.8) 0%, rgba(2, 44, 34, 0.9) 100%)',
  },
}
```

---

*End of specification.*
