import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',

  theme: {
    extend: {
      // ── Design Schema Colors ──
      colors: {
        // Light mode surfaces
        surface: {
          primary: '#FFFFFF',
          secondary: '#F2F2F5',
          accent: '#292A21',
        },
        // Dark mode surfaces (applied via dark: prefix)
        'dark-surface': {
          primary: '#1D1D1F',
          secondary: '#2D2D2F',
          accent: '#293E46',
        },
        // Accent pills
        pill: {
          charcoal: '#292A21',
          silver: '#F2F2F5',
          'dark-silver': '#2D2D2F',
        },
        // Agent team colors (for canvas nodes)
        agent: {
          ops: '#4A90D9',       // Operations team - blue
          dev: '#50C878',       // Development team - green
          intel: '#FFB347',     // Intelligence team - amber
          solo: '#9B59B6',      // Solo agents - purple
        },
        // Payload type colors (for typed edges)
        payload: {
          briefing: '#6366F1',
          research: '#3B82F6',
          design: '#8B5CF6',
          code: '#10B981',
          verdict: '#F59E0B',
          review: '#EF4444',
          signal: '#EC4899',
        },
        // Status colors
        status: {
          running: '#3B82F6',
          success: '#10B981',
          error: '#EF4444',
          paused: '#F59E0B',
          idle: '#6B7280',
        },
      },

      // ── Button Gradients (as CSS custom properties) ──
      backgroundImage: {
        // Light mode buttons
        'btn-buy-light': 'linear-gradient(135deg, #D1D0D1, #313B3E)',
        'btn-browse-light': 'linear-gradient(135deg, #1222F5, #D1D1D5)',
        'btn-cart-light': 'linear-gradient(135deg, #0071E3, #004B9B)',
        // Dark mode buttons
        'btn-buy-dark': 'linear-gradient(135deg, #1B9F18, #018535)',
        'btn-browse-dark': 'linear-gradient(135deg, #2222F6, #233355)',
        'btn-cart-dark': 'linear-gradient(135deg, #3071E3, #ED71EB)',
        // Accent pill gradients - Light
        'pill-charcoal-light': 'linear-gradient(135deg, #292A21, #3D3E35)',
        'pill-silver-light': 'linear-gradient(135deg, #F2F2F5, #E5E5E8)',
        'pill-dark-silver-light': 'linear-gradient(135deg, #6B6B6E, #4A4A4D)',
        // Accent pill gradients - Dark
        'pill-charcoal-dark': 'linear-gradient(135deg, #3D3E35, #292A21)',
        'pill-silver-dark': 'linear-gradient(135deg, #4A4A4D, #3D3D40)',
        'pill-dark-silver-dark': 'linear-gradient(135deg, #2D2D2F, #1D1D1F)',
      },

      // ── Typography ──
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        'display-xl': ['3.5rem', { lineHeight: '1.1', fontWeight: '700' }],
        'display-lg': ['2.5rem', { lineHeight: '1.15', fontWeight: '700' }],
        'display-md': ['2rem', { lineHeight: '1.2', fontWeight: '600' }],
        'display-sm': ['1.5rem', { lineHeight: '1.25', fontWeight: '600' }],
        'body-lg': ['1.125rem', { lineHeight: '1.6', fontWeight: '400' }],
        'body-md': ['1rem', { lineHeight: '1.5', fontWeight: '400' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],
        'caption': ['0.75rem', { lineHeight: '1.4', fontWeight: '500' }],
      },

      // ── Layout ──
      maxWidth: {
        'storefront': '1280px',
      },
      gridTemplateColumns: {
        'app': '240px 1fr 320px',           // palette | canvas | inspector
        'app-collapsed': '240px 1fr 48px',  // inspector collapsed
        'products-sm': 'repeat(1, 1fr)',
        'products-md': 'repeat(2, 1fr)',
        'products-lg': 'repeat(3, 1fr)',
        'products-xl': 'repeat(4, 1fr)',
      },

      // ── Animations ──
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flow-edge': 'flowDash 1.5s linear infinite',
        'cost-tick': 'costTick 0.3s ease-out',
      },
      keyframes: {
        flowDash: {
          '0%': { strokeDashoffset: '24' },
          '100%': { strokeDashoffset: '0' },
        },
        costTick: {
          '0%': { transform: 'scale(1.2)', color: '#EF4444' },
          '100%': { transform: 'scale(1)', color: 'inherit' },
        },
      },

      // ── Spacing ──
      spacing: {
        'node-w': '280px',       // Agent node width
        'node-w-expanded': '360px',
        'palette-w': '240px',
        'inspector-w': '320px',
      },

      // ── Shadows ──
      boxShadow: {
        'node': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'node-hover': '0 4px 16px rgba(0, 0, 0, 0.12)',
        'node-active': '0 0 0 2px rgba(59, 130, 246, 0.5)',
        'node-error': '0 0 0 2px rgba(239, 68, 68, 0.5)',
      },

      // ── Border Radius ──
      borderRadius: {
        'node': '12px',
        'pill': '9999px',
      },
    },
  },
  plugins: [],
}

export default config
