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
  { id: "terminal", label: "Terminal" },
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
                ? "bg-red-600 text-white shadow-md"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {page.label}
          </button>
        ))}
      </div>

      {/* Right: Theme + Sign In + Sign Out */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <button
          onClick={onSignIn}
          className="px-3 py-1 text-caption font-medium rounded-pill border border-gray-700 text-gray-400 hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors"
        >
          Sign In
        </button>
        <button
          onClick={onSignOut}
          className="px-3 py-1 text-caption font-medium rounded-pill border border-gray-700 text-gray-400 hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </nav>
  );
}
