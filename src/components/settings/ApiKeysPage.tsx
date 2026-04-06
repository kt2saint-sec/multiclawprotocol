import { useState, useEffect } from "react";

interface ApiKey {
  id: string;
  label: string;
  placeholder: string;
  description: string;
}

const API_KEYS: ApiKey[] = [
  {
    id: "openrouter",
    label: "OpenRouter",
    placeholder: "sk-or-v1-...",
    description:
      "Primary model router — routes to Qwen, Gemma, DeepSeek, GLM models",
  },
  {
    id: "openrouter_pool1",
    label: "OpenRouter Pool #2",
    placeholder: "sk-or-v1-...",
    description: "Overflow key — $10/week cap, round-robin distribution",
  },
  {
    id: "openrouter_pool2",
    label: "OpenRouter Pool #3",
    placeholder: "sk-or-v1-...",
    description: "Overflow key — $10/week cap, round-robin distribution",
  },
  {
    id: "anthropic",
    label: "Anthropic",
    placeholder: "sk-ant-...",
    description: "Claude Sonnet/Opus — used for code review and fallback",
  },
  {
    id: "ollama",
    label: "Ollama Host",
    placeholder: "http://localhost:11434",
    description: "Local Ollama endpoint — zero cost, runs on your GPU",
  },
];

const STORAGE_KEY = "anvilbus-api-keys";

export function ApiKeysPage() {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setKeys(JSON.parse(stored));
    } catch {
      // ignore parse errors
    }
  }, []);

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

  const maskedValue = (value: string) => {
    if (!value) return "";
    if (value.length <= 8) return "••••••••";
    return (
      value.slice(0, 6) +
      "•".repeat(Math.min(20, value.length - 10)) +
      value.slice(-4)
    );
  };

  return (
    <div className="h-full overflow-y-auto bg-[#0F1117]">
      <div className="max-w-2xl mx-auto py-8 px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-display-sm font-bold text-white tracking-tight">
            API Keys
          </h1>
          <p className="text-body-sm text-gray-500 mt-1">
            Configure your model provider credentials. Keys are stored locally
            on your device.
          </p>
        </div>

        {/* Key inputs */}
        <div className="space-y-5">
          {API_KEYS.map((apiKey) => (
            <div
              key={apiKey.id}
              className="bg-[#1A1C24] border border-gray-700/50 rounded-node p-4"
            >
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-body-sm font-semibold text-white">
                  {apiKey.label}
                </label>
                {keys[apiKey.id] && (
                  <span className="text-[0.6rem] font-mono px-1.5 py-0.5 rounded-pill bg-[#1A5632]/30 text-[#4ade80] border border-[#1A5632]/50">
                    configured
                  </span>
                )}
              </div>
              <p className="text-caption text-gray-500 mb-2">
                {apiKey.description}
              </p>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type={showKeys[apiKey.id] ? "text" : "password"}
                    value={
                      showKeys[apiKey.id]
                        ? keys[apiKey.id] || ""
                        : maskedValue(keys[apiKey.id] || "")
                    }
                    onChange={(e) => updateKey(apiKey.id, e.target.value)}
                    onFocus={() => {
                      if (!showKeys[apiKey.id]) toggleShow(apiKey.id);
                    }}
                    placeholder={apiKey.placeholder}
                    className="w-full px-3 py-2 text-body-sm font-mono rounded-node bg-[#0F1117] border border-gray-700/50 text-white placeholder-gray-600 focus:border-[#1B3A6B] focus:ring-1 focus:ring-[#1B3A6B] outline-none transition-colors"
                  />
                </div>
                <button
                  onClick={() => toggleShow(apiKey.id)}
                  className="px-3 py-2 text-caption rounded-node border border-gray-700/50 text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-colors"
                >
                  {showKeys[apiKey.id] ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={saveAll}
            className="px-5 py-2.5 rounded-pill font-semibold text-body-sm text-white bg-gradient-to-r from-[#1B3A6B] to-[#1E40AF] hover:from-[#1E40AF] hover:to-[#1B3A6B] shadow-lg shadow-[#1B3A6B]/25 transition-all"
          >
            {saved ? "Saved" : "Save Keys"}
          </button>
          <button
            onClick={clearAll}
            className="px-5 py-2.5 rounded-pill text-body-sm text-gray-500 border border-gray-700/50 hover:text-red-400 hover:border-red-400/30 transition-colors"
          >
            Clear All
          </button>
          <span className="text-caption text-gray-600 ml-auto">
            Keys stored in localStorage — never sent to any server
          </span>
        </div>

        {/* Model routing info */}
        <div className="mt-10 bg-[#1A1C24] border border-gray-700/50 rounded-node p-4">
          <h2 className="text-body-sm font-bold text-white mb-3">
            Model Routing Table
          </h2>
          <div className="space-y-1.5 text-caption font-mono">
            {[
              {
                model: "qwen3.6-plus:free",
                provider: "OpenRouter",
                cost: "$0",
              },
              {
                model: "qwen3-32b",
                provider: "OpenRouter",
                cost: "$0.08/$0.24",
              },
              {
                model: "gemma-4-26b",
                provider: "OpenRouter",
                cost: "$0.13/$0.40",
              },
              {
                model: "deepseek-v3.2",
                provider: "OpenRouter",
                cost: "$0.28/$0.42",
              },
              {
                model: "glm-5v-turbo",
                provider: "OpenRouter",
                cost: "$1.20/$4.00",
              },
              {
                model: "claude-sonnet-4.5",
                provider: "Anthropic",
                cost: "$3/$15",
              },
              { model: "gemma4:26b", provider: "Ollama (local)", cost: "$0" },
            ].map((m) => (
              <div
                key={m.model}
                className="flex items-center justify-between text-gray-400"
              >
                <span>{m.model}</span>
                <span className="flex items-center gap-3">
                  <span className="text-gray-600">{m.provider}</span>
                  <span className="text-[#7dd3fc]">{m.cost}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
