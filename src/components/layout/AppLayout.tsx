import React from "react";

interface AppLayoutProps {
  palette: React.ReactNode;
  canvas: React.ReactNode;
  inspector: React.ReactNode;
  statusBar: React.ReactNode;
}

/**
 * Root layout shell.
 * Top: canvas (flex) | inspector (320px)
 * Bottom: horizontal agent palette strip + status bar
 */
export const AppLayout: React.FC<AppLayoutProps> = ({
  palette,
  canvas,
  inspector,
  statusBar,
}) => {
  return (
    <div className="h-screen w-screen overflow-hidden bg-surface-primary dark:bg-dark-surface-primary text-surface-accent dark:text-gray-200 flex flex-col">
      {/* Top area: canvas + inspector side by side */}
      <div className="flex-1 flex min-h-0">
        {/* Canvas — fills available space */}
        <main
          className="flex-1 overflow-hidden relative bg-surface-primary dark:bg-dark-surface-primary"
          aria-label="Pipeline canvas"
        >
          {canvas}
        </main>

        {/* Right sidebar — Inspector Panel */}
        <aside
          className="w-[320px] flex-none h-full overflow-y-auto border-l border-gray-200 dark:border-gray-700 bg-surface-secondary dark:bg-dark-surface-secondary flex flex-col"
          aria-label="Inspector panel"
        >
          {inspector}
        </aside>
      </div>

      {/* Bottom: Agent palette strip */}
      <div
        className="flex-none border-t border-gray-200 dark:border-gray-700 bg-surface-secondary dark:bg-dark-surface-secondary"
        aria-label="Agent palette"
      >
        {palette}
      </div>

      {/* Status bar */}
      <footer className="flex-none border-t border-gray-200 dark:border-gray-700 bg-surface-secondary dark:bg-dark-surface-secondary">
        {statusBar}
      </footer>
    </div>
  );
};

export default AppLayout;
