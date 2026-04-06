import { useState, useEffect } from "react";

interface DepStatus {
  name: string;
  description: string;
  installCmd: string;
  status: "checking" | "installed" | "missing";
  version?: string;
  critical?: boolean;
}

const INITIAL_DEPS: DepStatus[] = [
  {
    name: "ChromaDB",
    description: "Vector database — agent memory and semantic search",
    installCmd: "pip install chromadb sentence-transformers",
    status: "checking",
    critical: true,
  },
  {
    name: "Docker",
    description: "Optional — sandboxed agent execution for BUILDER agent",
    installCmd: "curl -fsSL https://get.docker.com | sh",
    status: "checking",
    critical: false,
  },
  {
    name: "Ollama (optional)",
    description:
      "Local model hosting — run AI models on your GPU. Not required if using cloud models only.",
    installCmd: "curl -fsSL https://ollama.com/install.sh | sh && ollama serve",
    status: "checking",
    critical: false,
  },
];

async function checkDep(dep: DepStatus): Promise<DepStatus> {
  switch (dep.name) {
    case "ChromaDB": {
      try {
        const resp = await fetch("http://localhost:8000/api/v1/heartbeat", {
          signal: AbortSignal.timeout(1500),
        });
        if (resp.ok) return { ...dep, status: "installed", version: "server" };
      } catch {
        /* not running as HTTP server */
      }
      return { ...dep, status: "missing" };
    }

    case "Docker": {
      try {
        const resp = await fetch("http://localhost:2375/version", {
          signal: AbortSignal.timeout(1500),
        });
        if (resp.ok) return { ...dep, status: "installed", version: "TCP" };
      } catch {
        /* Docker typically uses Unix socket, not TCP */
      }
      return { ...dep, status: "missing" };
    }

    case "Ollama (optional)": {
      try {
        const resp = await fetch("http://localhost:11434/api/version", {
          signal: AbortSignal.timeout(2000),
        });
        if (resp.ok) {
          const data = await resp.json();
          return { ...dep, status: "installed", version: data.version };
        }
      } catch {
        /* not running */
      }
      return { ...dep, status: "missing" };
    }

    default:
      return { ...dep, status: "missing" };
  }
}

interface FirstLaunchCheckProps {
  onComplete: () => void;
}

export function FirstLaunchCheck({ onComplete }: FirstLaunchCheckProps) {
  const [deps, setDeps] = useState<DepStatus[]>(INITIAL_DEPS);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function runChecks() {
      const results = await Promise.all(INITIAL_DEPS.map(checkDep));
      setDeps(results);
      setChecking(false);
    }
    void runChecks();
  }, []);

  const allInstalled = deps.every((d) => d.status === "installed");
  const missingCount = deps.filter((d) => d.status === "missing").length;

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#0F1117]">
      <div className="w-full max-w-lg px-6">
        {/* Header */}
        <div className="text-center mb-8">
          <img
            src="/logos/logo-portal.png"
            alt="MultiClawProtocol"
            className="h-12 mx-auto mb-3"
          />
          <p className="text-body-sm text-gray-500">
            Checking optional dependencies...
          </p>
          <p className="text-[0.65rem] text-gray-600 mt-2">
            Hermes Agent is bundled with MultiClawProtocol.
            <br />
            Everything below is optional.
          </p>
        </div>

        {/* Dependency cards */}
        <div className="space-y-3">
          {deps.map((dep) => (
            <div
              key={dep.name}
              className="bg-[#1A1C24] border border-gray-700/50 rounded-node px-4 py-3 flex items-center gap-3"
            >
              {/* Status indicator */}
              <div className="flex-none">
                {dep.status === "checking" && (
                  <span className="w-5 h-5 border-2 border-gray-600 border-t-[#7dd3fc] rounded-full animate-spin inline-block" />
                )}
                {dep.status === "installed" && (
                  <span className="w-5 h-5 rounded-full bg-[#166534] flex items-center justify-center text-white text-[0.6rem] inline-flex">
                    ok
                  </span>
                )}
                {dep.status === "missing" && (
                  <span className="w-5 h-5 rounded-full bg-[#991b1b] flex items-center justify-center text-white text-[0.6rem] inline-flex">
                    !
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-body-sm font-semibold text-white">
                    {dep.name}
                  </span>
                  {dep.version && (
                    <span className="text-[0.6rem] font-mono text-gray-500">
                      v{dep.version}
                    </span>
                  )}
                </div>
                <p className="text-caption text-gray-500">{dep.description}</p>
              </div>

              {/* Install command */}
              {dep.status === "missing" && (
                <button
                  onClick={() => navigator.clipboard.writeText(dep.installCmd)}
                  className="flex-none px-2 py-1 text-[0.6rem] font-mono rounded bg-[#0F1117] border border-gray-700/50 text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
                  title={`Copy: ${dep.installCmd}`}
                >
                  Copy install cmd
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Actions — never blocks */}
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={onComplete}
            className="flex-1 py-3 rounded-pill font-semibold text-body-sm text-white bg-[#166534] hover:bg-[#15803d] transition-colors"
          >
            {checking
              ? "Checking..."
              : allInstalled
                ? "Launch MultiClawProtocol"
                : `Launch MultiClawProtocol${missingCount > 0 ? ` (${missingCount} optional not found)` : ""}`}
          </button>
          <button
            onClick={() => {
              setDeps(INITIAL_DEPS);
              setChecking(true);
              void (async () => {
                const results = await Promise.all(INITIAL_DEPS.map(checkDep));
                setDeps(results);
                setChecking(false);
              })();
            }}
            className="px-4 py-3 rounded-pill text-body-sm text-gray-500 border border-gray-700 hover:text-white hover:border-gray-500 transition-colors"
          >
            Re-check
          </button>
        </div>

        {/* Note */}
        <p className="text-center text-caption text-gray-600 mt-4">
          All dependencies are optional. Install them later to enable local
          models, sandboxed execution, and agent memory.
        </p>
      </div>
    </div>
  );
}
