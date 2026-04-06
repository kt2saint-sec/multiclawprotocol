import { useState } from "react";
import type { AgentManifest } from "../../types/agent";

/** All available models from the OpenClaw routing table */
const AVAILABLE_MODELS = [
  { id: "qwen/qwen3.6-plus:free", label: "Qwen 3.6+ (Free)", cost: "$0" },
  { id: "qwen/qwen3-32b", label: "Qwen3 32B", cost: "$0.08/$0.24" },
  {
    id: "google/gemma-4-26b-a4b-it",
    label: "Gemma 4 26B",
    cost: "$0.13/$0.40",
  },
  { id: "deepseek/deepseek-v3.2", label: "DeepSeek V3.2", cost: "$0.28/$0.42" },
  { id: "z-ai/glm-5v-turbo", label: "GLM 5V Turbo", cost: "$1.20/$4.00" },
  {
    id: "anthropic/claude-sonnet-4.5",
    label: "Claude Sonnet 4.5",
    cost: "$3/$15",
  },
  {
    id: "anthropic/claude-sonnet-4.6",
    label: "Claude Sonnet 4.6",
    cost: "$3/$15",
  },
  { id: "gemma4:26b", label: "Gemma 4 26B (Local)", cost: "$0" },
];

const ISOLATION_OPTIONS = ["subprocess", "docker", "in_process"] as const;

interface AgentConfigFormProps {
  manifest: AgentManifest;
  onUpdate?: (manifest: AgentManifest) => void;
}

export function AgentConfigForm({ manifest, onUpdate }: AgentConfigFormProps) {
  const [newToolId, setNewToolId] = useState("");

  const update = (partial: Partial<AgentManifest>) => {
    onUpdate?.({ ...manifest, ...partial });
  };

  const updateModel = (field: string, value: string | number) => {
    update({
      model: {
        ...manifest.model,
        preferred: { ...manifest.model.preferred, [field]: value },
      },
    });
  };

  const addTool = () => {
    if (!newToolId.trim()) return;
    update({
      tools: [
        ...manifest.tools,
        {
          id: newToolId.trim(),
          type: "builtin",
          enabled: true,
          permissions: {},
        },
      ],
    });
    setNewToolId("");
  };

  const removeTool = (toolId: string) => {
    update({ tools: manifest.tools.filter((t) => t.id !== toolId) });
  };

  return (
    <div className="space-y-5">
      {/* Agent Name */}
      <div>
        <label className="text-caption font-medium text-gray-400 block mb-1.5">
          Agent Name
        </label>
        <input
          value={manifest.display.name}
          onChange={(e) =>
            update({ display: { ...manifest.display, name: e.target.value } })
          }
          className="w-full px-3 py-2 text-body-sm rounded-node border border-gray-700/50
            bg-[#0F1117] text-white placeholder-gray-600
            focus:border-[#1B3A6B] focus:ring-1 focus:ring-[#1B3A6B] outline-none transition-colors"
        />
      </div>

      {/* Model Selection */}
      <div>
        <label className="text-caption font-medium text-gray-400 block mb-1.5">
          Model
        </label>
        <select
          value={manifest.model.preferred.model_id}
          onChange={(e) => updateModel("model_id", e.target.value)}
          className="w-full px-3 py-2 text-body-sm rounded-node border border-gray-700/50
            bg-[#0F1117] text-white
            focus:border-[#1B3A6B] focus:ring-1 focus:ring-[#1B3A6B] outline-none transition-colors"
        >
          {AVAILABLE_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label} — {m.cost}
            </option>
          ))}
          {/* Include current model if not in the list */}
          {!AVAILABLE_MODELS.some(
            (m) => m.id === manifest.model.preferred.model_id,
          ) && (
            <option value={manifest.model.preferred.model_id}>
              {manifest.model.preferred.model_id} (custom)
            </option>
          )}
        </select>
      </div>

      {/* Temperature */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-caption font-medium text-gray-400">
            Temperature
          </label>
          <span className="text-caption font-mono text-[#7dd3fc]">
            {manifest.model.preferred.temperature.toFixed(1)}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={manifest.model.preferred.temperature}
          onChange={(e) =>
            updateModel("temperature", parseFloat(e.target.value))
          }
          className="w-full accent-[#1B3A6B]"
        />
        <div className="flex justify-between text-[0.6rem] text-gray-600 mt-0.5">
          <span>Precise</span>
          <span>Creative</span>
        </div>
      </div>

      {/* Max Tokens */}
      <div>
        <label className="text-caption font-medium text-gray-400 block mb-1.5">
          Max Tokens
        </label>
        <input
          type="number"
          min={256}
          max={131072}
          step={256}
          value={manifest.model.preferred.max_tokens}
          onChange={(e) => updateModel("max_tokens", parseInt(e.target.value))}
          className="w-full px-3 py-2 text-body-sm font-mono rounded-node border border-gray-700/50
            bg-[#0F1117] text-white
            focus:border-[#1B3A6B] focus:ring-1 focus:ring-[#1B3A6B] outline-none transition-colors"
        />
      </div>

      {/* Isolation Mode */}
      <div>
        <label className="text-caption font-medium text-gray-400 block mb-1.5">
          Isolation
        </label>
        <div className="flex gap-1.5">
          {ISOLATION_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() =>
                update({
                  execution: { ...manifest.execution, isolation: opt },
                })
              }
              className={`flex-1 py-1.5 text-[0.65rem] font-medium rounded-pill border transition-all ${
                manifest.execution.isolation === opt
                  ? "bg-[#1B3A6B] border-[#1B3A6B] text-white"
                  : "border-gray-700/50 text-gray-500 hover:text-gray-300 hover:border-gray-600"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Tools */}
      <div>
        <label className="text-caption font-medium text-gray-400 block mb-1.5">
          Tools
        </label>
        <div className="space-y-1.5">
          {manifest.tools.map((tool) => (
            <div
              key={tool.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-node bg-[#0F1117] border border-gray-700/30"
            >
              <input
                type="checkbox"
                checked={tool.enabled}
                onChange={() =>
                  update({
                    tools: manifest.tools.map((t) =>
                      t.id === tool.id ? { ...t, enabled: !t.enabled } : t,
                    ),
                  })
                }
                className="rounded accent-[#1A5632]"
              />
              <span
                className={`flex-1 text-caption font-mono ${
                  tool.enabled ? "text-gray-300" : "text-gray-600 line-through"
                }`}
              >
                {tool.id}
              </span>
              <span className="text-[0.6rem] text-gray-600">{tool.type}</span>
              <button
                onClick={() => removeTool(tool.id)}
                className="text-gray-600 hover:text-red-400 text-caption transition-colors"
                title="Remove tool"
              >
                x
              </button>
            </div>
          ))}
        </div>
        {/* Add tool */}
        <div className="flex gap-1.5 mt-2">
          <input
            value={newToolId}
            onChange={(e) => setNewToolId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTool()}
            placeholder="Add tool..."
            className="flex-1 px-2 py-1.5 text-caption font-mono rounded-node border border-gray-700/50
              bg-[#0F1117] text-white placeholder-gray-600
              focus:border-[#1B3A6B] outline-none"
          />
          <button
            onClick={addTool}
            disabled={!newToolId.trim()}
            className="px-3 py-1.5 text-caption font-medium rounded-node bg-[#1A5632] text-white
              disabled:opacity-30 hover:brightness-110 transition-all"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
