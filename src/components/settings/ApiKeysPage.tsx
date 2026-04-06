import { useState, useEffect } from "react";

// ── Top OpenRouter models (curated from routing table) ──
const TOP_OPENROUTER_MODELS = [
  {
    id: "qwen/qwen3.6-plus:free",
    name: "Qwen 3.6+",
    cost: "Free",
    key: "openrouter",
  },
  {
    id: "qwen/qwen3-32b",
    name: "Qwen3 32B",
    cost: "$0.08/$0.24",
    key: "openrouter",
  },
  {
    id: "google/gemma-4-26b-a4b-it",
    name: "Gemma 4 26B",
    cost: "$0.13/$0.40",
    key: "openrouter",
  },
  {
    id: "deepseek/deepseek-v3.2",
    name: "DeepSeek V3.2",
    cost: "$0.28/$0.42",
    key: "openrouter",
  },
  {
    id: "z-ai/glm-5v-turbo",
    name: "GLM 5V Turbo",
    cost: "$1.20/$4.00",
    key: "openrouter",
  },
  {
    id: "anthropic/claude-sonnet-4.5",
    name: "Claude Sonnet 4.5",
    cost: "$3/$15",
    key: "anthropic",
  },
  {
    id: "anthropic/claude-sonnet-4.6",
    name: "Claude Sonnet 4.6",
    cost: "$3/$15",
    key: "anthropic",
  },
  {
    id: "anthropic/claude-opus-4.6",
    name: "Claude Opus 4.6",
    cost: "$15/$75",
    key: "anthropic",
  },
  {
    id: "meta-llama/llama-4-scout",
    name: "Llama 4 Scout",
    cost: "$0.15/$0.40",
    key: "openrouter",
  },
  {
    id: "mistralai/mistral-large-2",
    name: "Mistral Large 2",
    cost: "$2/$6",
    key: "openrouter",
  },
];

interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
}

interface ApiKeyConfig {
  id: string;
  label: string;
  placeholder: string;
}

const API_KEY_FIELDS: ApiKeyConfig[] = [
  {
    id: "openrouter",
    label: "OpenRouter API Key",
    placeholder: "sk-or-v1-...",
  },
  {
    id: "openrouter_pool1",
    label: "OpenRouter Pool #2",
    placeholder: "sk-or-v1-...",
  },
  {
    id: "openrouter_pool2",
    label: "OpenRouter Pool #3",
    placeholder: "sk-or-v1-...",
  },
  { id: "anthropic", label: "Anthropic", placeholder: "sk-ant-..." },
  { id: "openai", label: "OpenAI", placeholder: "sk-..." },
  { id: "google", label: "Google AI", placeholder: "AIza..." },
  { id: "grok", label: "Grok (xAI)", placeholder: "xai-..." },
  { id: "mistral", label: "Mistral", placeholder: "..." },
  {
    id: "ollama_host",
    label: "Ollama Host",
    placeholder: "http://localhost:11434",
  },
  {
    id: "litellm_host",
    label: "LiteLLM Proxy",
    placeholder: "http://localhost:4000",
  },
];

const STORAGE_KEY = "anvilbus-api-keys";
const MODEL_DISPLAY_LIMIT = 10;

function formatSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
  return `${bytes} B`;
}

export function ApiKeysPage() {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);
  const [localModels, setLocalModels] = useState<OllamaModel[]>([]);
  const [localLoading, setLocalLoading] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showAllLocal, setShowAllLocal] = useState(false);
  const [showAllCloud, setShowAllCloud] = useState(false);

  // Load keys from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setKeys(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  // Scan local Ollama models
  useEffect(() => {
    async function scanLocal() {
      setLocalLoading(true);
      setLocalError(null);
      const host = keys.ollama_host || "http://localhost:11434";
      try {
        const resp = await fetch(`${host}/api/tags`, {
          signal: AbortSignal.timeout(2000),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        setLocalModels(
          (data.models || []).map((m: Record<string, unknown>) => ({
            name: String(m.name || ""),
            size: Number(m.size || 0),
            modified_at: String(m.modified_at || ""),
          })),
        );
        setLocalError(null);
      } catch {
        setLocalError("Not running — start with: ollama serve");
        setLocalModels([]);
      } finally {
        setLocalLoading(false);
      }
    }
    scanLocal();
  }, [keys.ollama_host]);

  const updateKey = (id: string, value: string) => {
    setKeys((prev) => ({ ...prev, [id]: value }));
    setSaved(false);
  };

  const toggleShow = (id: string) => {
    setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const saveAll = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const clearAll = () => {
    setKeys({});
    localStorage.removeItem(STORAGE_KEY);
  };

  const displayedLocalModels = showAllLocal
    ? localModels
    : localModels.slice(0, MODEL_DISPLAY_LIMIT);
  const displayedCloudModels = showAllCloud
    ? TOP_OPENROUTER_MODELS
    : TOP_OPENROUTER_MODELS.slice(0, MODEL_DISPLAY_LIMIT);

  // Check which cloud models have a configured key
  const hasKey = (keyId: string) => Boolean(keys[keyId]?.trim());

  return (
    <div className="h-full overflow-y-auto bg-[#0F1117]">
      <div className="max-w-3xl mx-auto py-8 px-6 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-display-sm font-bold text-white tracking-tight">
            Settings
          </h1>
          <p className="text-body-sm text-gray-500 mt-1">
            API keys, local models, and cloud model routing.
          </p>
        </div>

        {/* ── API Keys ── */}
        <section>
          <h2 className="text-body-sm font-bold text-white mb-4">API Keys</h2>
          <div className="space-y-3">
            {API_KEY_FIELDS.map((field) => (
              <div
                key={field.id}
                className="flex items-center gap-3 bg-[#1A1C24] border border-gray-700/50 rounded-node px-4 py-3"
              >
                <label className="w-[160px] flex-none text-caption font-medium text-gray-400">
                  {field.label}
                </label>
                <input
                  type={showKeys[field.id] ? "text" : "password"}
                  value={
                    showKeys[field.id]
                      ? keys[field.id] || ""
                      : keys[field.id]
                        ? "••••••••••••"
                        : ""
                  }
                  onChange={(e) => updateKey(field.id, e.target.value)}
                  onFocus={() => {
                    if (!showKeys[field.id]) toggleShow(field.id);
                  }}
                  placeholder={field.placeholder}
                  className="flex-1 px-3 py-1.5 text-caption font-mono rounded-node bg-[#0F1117] border border-gray-700/50 text-white placeholder-gray-600 focus:border-[#1B3A6B] focus:ring-1 focus:ring-[#1B3A6B] outline-none transition-colors"
                />
                <button
                  onClick={() => toggleShow(field.id)}
                  className="text-caption text-gray-600 hover:text-gray-400 transition-colors w-10 text-center"
                >
                  {showKeys[field.id] ? "Hide" : "Show"}
                </button>
                {keys[field.id]?.trim() && (
                  <span
                    className="w-2 h-2 rounded-full bg-[#166534] flex-none"
                    title="Configured"
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={saveAll}
              className="px-4 py-2 rounded-pill text-caption font-semibold text-white bg-[#1B3A6B] hover:bg-[#1E40AF] transition-colors"
            >
              {saved ? "Saved" : "Save Keys"}
            </button>
            <button
              onClick={clearAll}
              className="px-4 py-2 rounded-pill text-caption text-gray-500 border border-gray-700/50 hover:text-red-400 hover:border-red-400/30 transition-colors"
            >
              Clear All
            </button>
          </div>
        </section>

        {/* ── Two model boxes side by side ── */}
        <div className="grid grid-cols-2 gap-4">
          {/* Local Models */}
          <section className="bg-[#1A1C24] border border-gray-700/50 rounded-node p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-body-sm font-bold text-white">
                Local Models
              </h2>
              <span className="text-[0.65rem] font-mono text-gray-500">
                {localModels.length} found
              </span>
            </div>

            {localLoading && (
              <p className="text-caption text-gray-500 animate-pulse">
                Scanning Ollama...
              </p>
            )}

            {localError && (
              <div className="text-caption text-red-400 bg-red-400/10 rounded-node px-3 py-2 mb-2">
                Ollama: {localError}
              </div>
            )}

            {!localLoading && localModels.length === 0 && !localError && (
              <p className="text-caption text-gray-500">
                No local models found. Install with: ollama pull gemma4:26b
              </p>
            )}

            <div className="space-y-1">
              {displayedLocalModels.map((m) => (
                <div
                  key={m.name}
                  className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-[#0F1117] transition-colors"
                >
                  <span className="text-caption font-mono text-white truncate">
                    {m.name}
                  </span>
                  <span className="text-[0.6rem] text-gray-500 flex-none ml-2">
                    {formatSize(m.size)}
                  </span>
                </div>
              ))}
            </div>

            {localModels.length > MODEL_DISPLAY_LIMIT && !showAllLocal && (
              <button
                onClick={() => setShowAllLocal(true)}
                className="text-caption text-[#7dd3fc] hover:underline mt-2"
              >
                more... ({localModels.length - MODEL_DISPLAY_LIMIT} hidden)
              </button>
            )}
            {showAllLocal && localModels.length > MODEL_DISPLAY_LIMIT && (
              <button
                onClick={() => setShowAllLocal(false)}
                className="text-caption text-gray-500 hover:underline mt-2"
              >
                show less
              </button>
            )}
          </section>

          {/* Cloud Models (OpenRouter / Anthropic) */}
          <section className="bg-[#1A1C24] border border-gray-700/50 rounded-node p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-body-sm font-bold text-white">
                Cloud Models
              </h2>
              <span className="text-[0.65rem] font-mono text-gray-500">
                {TOP_OPENROUTER_MODELS.length} available
              </span>
            </div>

            <div className="space-y-1">
              {displayedCloudModels.map((m) => {
                const keyConfigured = hasKey(m.key);
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-[#0F1117] transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-1.5 h-1.5 rounded-full flex-none ${keyConfigured ? "bg-[#166534]" : "bg-gray-600"}`}
                        title={
                          keyConfigured
                            ? `${m.key} key configured`
                            : `Needs ${m.key} key`
                        }
                      />
                      <span className="text-caption font-mono text-white truncate">
                        {m.name}
                      </span>
                    </div>
                    <span className="text-[0.6rem] text-[#7dd3fc] flex-none ml-2">
                      {m.cost}
                    </span>
                  </div>
                );
              })}
            </div>

            {TOP_OPENROUTER_MODELS.length > MODEL_DISPLAY_LIMIT &&
              !showAllCloud && (
                <button
                  onClick={() => setShowAllCloud(true)}
                  className="text-caption text-[#7dd3fc] hover:underline mt-2"
                >
                  more... ({TOP_OPENROUTER_MODELS.length - MODEL_DISPLAY_LIMIT}{" "}
                  hidden)
                </button>
              )}
            {showAllCloud &&
              TOP_OPENROUTER_MODELS.length > MODEL_DISPLAY_LIMIT && (
                <button
                  onClick={() => setShowAllCloud(false)}
                  className="text-caption text-gray-500 hover:underline mt-2"
                >
                  show less
                </button>
              )}

            {!hasKey("openrouter") && !hasKey("anthropic") && (
              <p className="text-caption text-amber-400/80 mt-3">
                Add an API key above to enable cloud models
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
