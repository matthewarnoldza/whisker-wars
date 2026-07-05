
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'slate': {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        'gold': {
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
        },
        'purple': {
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
        },
        'jungle': {
          950: '#022c22',
          900: '#064e3b',
          800: '#065f46',
          700: '#047857',
        },

        /* ── Semantic design tokens (the game table) ──────────────────
           Additive layer the whole app converges on. Existing tokens
           above stay live until later migration waves retire them. */

        // Atmospheric surface scale — deep ink up to raised overlays.
        'surface': {
          deep: '#080b14',      // page floor / behind everything
          DEFAULT: '#0f1626',   // base panel fill
          raised: '#18223a',    // lifted card / elevated content
          overlay: '#232f4d',   // modals, popovers, hovered rows
          border: '#2b3a5c',    // hairline separators on dark
        },

        // Text scale on dark (WCAG-checked, see report).
        'ink': {
          DEFAULT: '#f1f5f9',   // primary body text
          muted: '#cbd5e1',     // secondary text
          subtle: '#94a3b8',    // captions / metadata
          faint: '#64748b',     // disabled / placeholder
        },

        // Radiant gold — the single hero accent (buttons, currency, wins).
        'accent': {
          100: '#fef9c3',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#facc15',
          DEFAULT: '#f5b70a',   // hero fill
          500: '#eab308',
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
        },

        // Arcane purple — secondary (jungle / mystic / epic).
        'arcane': {
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          DEFAULT: '#a855f7',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
        },

        // Semantic state colors.
        'success': {
          DEFAULT: '#22c55e',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
        },
        'danger': {
          DEFAULT: '#ef4444',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
        },
        'warning': {
          DEFAULT: '#f59e0b',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
      },
      borderRadius: {
        // Codified game-surface radii.
        'btn': '0.75rem',
        'card': '0.875rem',
        'panel': '1.125rem',
        'pill': '9999px',
      },
      zIndex: {
        'bg': '0',
        'content': '10',
        'card-overlay': '20',
        'header': '40',
        'dropdown': '50',
        'zoom': '60',
        'celebration': '70',
        'modal-backdrop': '80',
        'modal': '90',
        'critical': '130', // data-loss/cloud banners must outrank modals (z-[120])
      },
      boxShadow: {
        'premium': '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'premium-lg': '0 12px 48px rgba(0, 0, 0, 0.6), 0 0 40px rgba(234, 179, 8, 0.2)',
        'glow-gold': '0 0 20px rgba(234, 179, 8, 0.4), 0 0 40px rgba(234, 179, 8, 0.2)',
        'glow-purple': '0 0 20px rgba(168, 85, 247, 0.4), 0 0 40px rgba(168, 85, 247, 0.2)',
        'inner-glow': 'inset 0 0 20px rgba(234, 179, 8, 0.1)',
        'stat': '0 2px 8px rgba(0, 0, 0, 0.6)',
        'fantasy': '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(147, 51, 234, 0.15)',
        'neon': '0 0 15px rgba(34, 197, 94, 0.4), 0 0 30px rgba(34, 197, 94, 0.2)',
        'neon-intense': '0 0 20px rgba(34, 197, 94, 0.6), 0 0 40px rgba(34, 197, 94, 0.3)',

        /* ── Codified card/panel look: soft outer shadow + inner top-light ── */
        'panel': '0 8px 24px -6px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
        'panel-raised': '0 18px 44px -10px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.09)',
        'panel-inset': 'inset 0 2px 6px rgba(0, 0, 0, 0.45)',
        // Gold accent glows (button hover, currency, wins).
        'glow-gold-sm': '0 0 12px rgba(245, 183, 10, 0.35)',
        'glow-gold-lg': '0 0 24px rgba(245, 183, 10, 0.45), 0 0 48px rgba(245, 183, 10, 0.25)',
        'glow-arcane': '0 0 20px rgba(168, 85, 247, 0.4), 0 0 40px rgba(168, 85, 247, 0.2)',
        // Keyboard/controller focus ring (gold) — seeds Steam input work.
        'focus-gold': '0 0 0 3px rgba(245, 183, 10, 0.55)',
      },
      backgroundImage: {
        'premium-gradient': 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)',
        'gold-gradient': 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
        'purple-gradient': 'linear-gradient(135deg, #a855f7 0%, #9333ea 50%, #7e22ce 100%)',
        'card-shine': 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(255,255,255,0.1) 100%)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'shimmer': 'shimmer 3s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        // Display identity: Grenze — medieval-humanist serif, playful dark fantasy.
        'heading': ['Grenze', 'Inter', 'system-ui', 'serif'],
        'display': ['Grenze', 'Inter', 'system-ui', 'serif'],
      },
      backdropBlur: {
        'xs': '2px',
        'xl': '20px',
      },
    },
  },
  darkMode: 'class',
  plugins: [],
}
