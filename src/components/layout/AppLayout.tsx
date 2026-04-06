import React from "react";

interface AppLayoutProps {
  palette: React.ReactNode;
  canvas: React.ReactNode;
  inspector: React.ReactNode;
  statusBar: React.ReactNode;
}

/**
 * Root CSS Grid layout shell.
 * Columns: 240px (palette) | flex-1 (canvas) | 320px (inspector)
 * Rows:    1fr (main content) | auto (status bar)
 */
export const AppLayout: React.FC<AppLayoutProps> = ({
  palette,
  canvas,
  inspector,
  statusBar,
}) => {
  return (
    <div className="h-screen w-screen overflow-hidden bg-surface-primary dark:bg-dark-surface-primary text-surface-accent dark:text-gray-200 grid grid-rows-[1fr_auto]">
      {/* Main 3-column area */}
      <div
        className="grid overflow-hidden min-h-0"
        style={{ gridTemplateColumns: "240px 1fr 320px" }}
      >
        {/* Left sidebar — Agent Palette */}
        <aside
          className="h-full overflow-y-auto border-r border-gray-200 dark:border-gray-700 bg-surface-secondary dark:bg-dark-surface-secondary flex flex-col"
          aria-label="Agent palette"
        >
          {palette}
        </aside>

        {/* Center — Pipeline Canvas */}
        <main
          className="h-full overflow-hidden relative bg-surface-primary dark:bg-dark-surface-primary"
          aria-label="Pipeline canvas"
        >
          {canvas}
        </main>

        {/* Right sidebar — Inspector Panel */}
        <aside
          className="h-full overflow-y-auto border-l border-gray-200 dark:border-gray-700 bg-surface-secondary dark:bg-dark-surface-secondary flex flex-col"
          aria-label="Inspector panel"
        >
          {inspector}
        </aside>
      </div>

      {/* Bottom status bar */}
      <footer className="border-t border-gray-200 dark:border-gray-700 bg-surface-secondary dark:bg-dark-surface-secondary">
        {statusBar}
      </footer>
    </div>
  );
};

export default AppLayout;
