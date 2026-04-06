import { ThemeToggle } from "./ThemeToggle";

interface TopNavProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  userEmail: string | null;
  onSignOut: () => void;
}

const PAGES = [
  { id: "canvas", label: "Pipeline" },
  { id: "network", label: "3D Map" },
  { id: "settings", label: "Settings" },
];

export function TopNav({
  currentPage,
  onNavigate,
  userEmail,
  onSignOut,
}: TopNavProps) {
  return (
    <nav className="flex items-center justify-between h-11 px-4 bg-[#0A0B0F] border-b border-gray-800/50 flex-none">
      {/* Left: Brand + Auth */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => onNavigate("canvas")}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <span className="text-body-sm font-bold tracking-tight bg-gradient-to-r from-[#1B3A6B] to-[#7dd3fc] bg-clip-text text-transparent">
            MultiClawProtocol
          </span>
        </button>

        {userEmail && (
          <span className="text-[0.65rem] text-gray-600 font-mono truncate max-w-[140px]">
            {userEmail}
          </span>
        )}
      </div>

      {/* Center: Page tabs */}
      <div className="flex items-center gap-1 bg-[#0F1117] rounded-pill p-0.5">
        {PAGES.map((page) => (
          <button
            key={page.id}
            onClick={() => onNavigate(page.id)}
            className={`px-3 py-1 text-caption font-medium rounded-pill transition-all ${
              currentPage === page.id
                ? "bg-[#1B3A6B] text-white shadow-md"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {page.label}
          </button>
        ))}
      </div>

      {/* Right: Theme + Sign out */}
      <div className="flex items-center gap-3">
        <ThemeToggle />
        {userEmail && (
          <button
            onClick={onSignOut}
            className="text-caption text-gray-600 hover:text-gray-400 transition-colors"
          >
            Sign Out
          </button>
        )}
      </div>
    </nav>
  );
}
