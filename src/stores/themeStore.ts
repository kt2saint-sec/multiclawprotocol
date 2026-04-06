import { create } from "zustand";

interface ThemeState {
  isDark: boolean;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  isDark: (() => {
    const stored = localStorage.getItem("mcp-theme");
    if (stored) return stored === "dark";
    // Default to dark mode — primary theme
    return true;
  })(),
  toggle: () =>
    set((state) => {
      const next = !state.isDark;
      localStorage.setItem("mcp-theme", next ? "dark" : "light");
      return { isDark: next };
    }),
}));
