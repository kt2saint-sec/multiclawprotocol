import { create } from 'zustand'

interface ThemeState {
  isDark: boolean
  toggle: () => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  isDark: (() => {
    const stored = localStorage.getItem('mcp-theme')
    if (stored) return stored === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })(),
  toggle: () =>
    set((state) => {
      const next = !state.isDark
      localStorage.setItem('mcp-theme', next ? 'dark' : 'light')
      return { isDark: next }
    }),
}))
