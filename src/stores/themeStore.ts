import { create } from 'zustand'

interface ThemeState {
  isDark: boolean
  toggle: () => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  isDark: (() => {
    const stored = localStorage.getItem('anvilbus-theme')
    if (stored) return stored === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })(),
  toggle: () =>
    set((state) => {
      const next = !state.isDark
      localStorage.setItem('anvilbus-theme', next ? 'dark' : 'light')
      return { isDark: next }
    }),
}))
