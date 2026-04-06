import { ThemeToggle } from "./ThemeToggle";

interface TopNavProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isAuthenticated: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

const PAGES = [
  { id: "canvas", label: "Pipeline" },
  { id: "network", label: "3D Map" },
  { id: "settings", label: "Settings" },
];

const brandFont = { fontFamily: "'Impact', 'Arial Black', sans-serif" };

export function TopNav({
  currentPage,
  onNavigate,
  isAuthenticated,
  onSignIn,
  onSignOut,
}: TopNavProps) {
  return (
    <nav className="flex items-center justify-between h-11 px-4 bg-[#0A0B0F] border-b border-gray-800/50 flex-none">
      {/* Left: Brand */}
      <button
        onClick={() => onNavigate("canvas")}
        className="flex items-center hover:opacity-80 transition-opacity"
      >
        <span
          className="text-body-lg font-black tracking-tight text-gray-300"
          style={brandFont}
        >
          MULTI
        </span>
        <span
          className="text-body-lg font-black tracking-tight text-red-500"
          style={brandFont}
        >
          CLAW
        </span>
        <span
          className="text-body-lg font-black tracking-tight text-gray-300"
          style={brandFont}
        >
          PROTOCOL
        </span>
      </button>

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

      {/* Right: Theme + Auth */}
      <div className="flex items-center gap-3">
        <ThemeToggle />
        {isAuthenticated ? (
          <button
            onClick={onSignOut}
            className="px-3 py-1 text-caption font-medium rounded-pill border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
          >
            Sign Out
          </button>
        ) : (
          <button
            onClick={onSignIn}
            className="px-3 py-1 text-caption font-medium rounded-pill bg-[#1B3A6B] text-white hover:bg-[#1E40AF] transition-colors"
          >
            Sign In
          </button>
        )}
      </div>
    </nav>
  );
}
