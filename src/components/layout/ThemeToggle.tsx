import { useEffect, type ReactNode } from "react";
import { useThemeStore } from "../../stores/themeStore";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const isDark = useThemeStore((s) => s.isDark);

  useEffect(() => {
    // Dark mode is the primary design — always ensure dark class is present
    // Light mode support is planned but not production-ready
    document.documentElement.classList.add("dark");
    if (!isDark) {
      // Future: remove 'dark' class when light mode is fully implemented
      // document.documentElement.classList.remove('dark')
    }
  }, [isDark]);

  return <>{children}</>;
}

export function ThemeToggle() {
  const { isDark, toggle } = useThemeStore();

  return (
    <button
      onClick={toggle}
      className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm"
      aria-label="Toggle theme"
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}
