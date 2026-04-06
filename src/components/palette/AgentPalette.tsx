import { useState, useMemo, useCallback, useRef } from "react";
import { PaletteSearch } from "./PaletteSearch";
import { DraggableAgentCard } from "./DraggableAgentCard";
import { useAgentRegistryStore } from "../../stores/agentRegistryStore";
import { useFlowStore } from "../../stores/flowStore";
import type { AgentManifest } from "../../types/agent";

const TEAM_ORDER = ["blue", "green", "amber", "purple", "red", "gray"];
const TEAM_LABELS: Record<string, string> = {
  blue: "The Brain",
  green: "The Forge",
  amber: "The Hustle",
  purple: "Solo Agents",
  red: "Supervisors",
  gray: "Utility",
};

const TEAM_OPTIONS = [
  { id: "blue", label: "Brain", color: "#1B3A6B" },
  { id: "green", label: "Forge", color: "#1A5632" },
  { id: "amber", label: "Hustle", color: "#FFB347" },
  { id: "purple", label: "Solo", color: "#6B21A8" },
  { id: "red", label: "Supervisor", color: "#DC2626" },
  { id: "gray", label: "Utility", color: "#4B5563" },
];

const DEFAULT_TOOLS = [
  {
    id: "web_search",
    type: "builtin" as const,
    enabled: true,
    permissions: {},
  },
  { id: "file_read", type: "builtin" as const, enabled: true, permissions: {} },
  {
    id: "file_write",
    type: "builtin" as const,
    enabled: false,
    permissions: {},
  },
  {
    id: "shell_exec",
    type: "builtin" as const,
    enabled: false,
    permissions: {},
  },
  {
    id: "chroma_search",
    type: "builtin" as const,
    enabled: true,
    permissions: {},
  },
  {
    id: "chroma_store",
    type: "builtin" as const,
    enabled: true,
    permissions: {},
  },
];

function createBlankAgent(): AgentManifest {
  const id = `custom-${Date.now()}`;
  return {
    id,
    version: "1.0.0",
    api_version: "agent/v1",
    display: {
      name: "New Agent",
      description: "",
      icon: "⚙",
      color_class: "gray",
      color_hex: "#4B5563",
      tags: ["custom"],
    },
    soul: {
      path: "./SOUL.md",
      role: "Custom agent",
      goal: "Define this agent's goal",
      constraints: [],
    },
    model: {
      preferred: {
        model_id: "qwen/qwen3.6-plus:free",
        provider: "openrouter",
        temperature: 0.7,
        max_tokens: 4096,
      },
      fallback_chain: [],
    },
    tools: [],
    schemas: { payload_type: "signal", input: {}, output: {} },
    memory: {
      enabled: false,
      short_term: {
        backend: "chromadb",
        collection: "agent_scratchpad",
        ttl_minutes: 60,
      },
      long_term: { backend: "chromadb", collection: "agent_memory" },
      shared: { read: [], write: [] },
      retrieval: {
        semantic_weight: 0.7,
        recency_weight: 0.2,
        importance_weight: 0.1,
        default_k: 5,
        confidence_threshold: 0.6,
      },
    },
    health: {
      readiness: { type: "ping", interval_seconds: 30, timeout_seconds: 5 },
      liveness: { type: "heartbeat", interval_seconds: 60 },
    },
    execution: {
      isolation: "subprocess",
      docker_image: null,
      working_dir: "./workspace",
      env_required: [],
      env_optional: [],
    },
    resource_limits: {
      max_execution_time_seconds: 300,
      max_tool_iterations: 15,
      max_tokens_per_turn: 8192,
      memory_limit_mb: 512,
    },
  };
}

const SCROLL_AMOUNT = 300;
const arrowBtn =
  "flex-none w-10 h-full flex items-center justify-center cursor-pointer select-none bg-surface-secondary dark:bg-dark-surface-secondary border-x border-[#898F9C]/50 dark:border-gray-700/50 hover:bg-[#898F9C]/20 dark:hover:bg-white/10 transition-colors";

export function AgentPalette() {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newGoal, setNewGoal] = useState("");
  const [newTeam, setNewTeam] = useState("gray");
  const agentsMap = useAgentRegistryStore((s) => s.agents);
  const registerAgent = useAgentRegistryStore((s) => s.registerAgent);
  const addNode = useFlowStore((s) => s.addNode);
  const selectNode = useFlowStore((s) => s.selectNode);
  const agents = useMemo(() => Object.values(agentsMap), [agentsMap]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!search) return agents;
    const q = search.toLowerCase();
    return agents.filter(
      (a) =>
        a.display.name.toLowerCase().includes(q) ||
        a.display.tags.some((t) => t.toLowerCase().includes(q)) ||
        a.schemas.payload_type.toLowerCase().includes(q),
    );
  }, [agents, search]);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof agents> = {};
    for (const a of filtered) {
      const key = a.display.color_class || "gray";
      if (!groups[key]) groups[key] = [];
      groups[key].push(a);
    }
    return groups;
  }, [filtered]);

  const handleCreateAgent = useCallback(() => {
    if (!newName.trim()) return;
    const agent = createBlankAgent();
    const team = TEAM_OPTIONS.find((t) => t.id === newTeam) ?? TEAM_OPTIONS[5];
    agent.display.name = newName.trim();
    agent.display.color_class = team.id;
    agent.display.color_hex = team.color;
    agent.display.tags = ["custom", team.label.toLowerCase()];
    agent.soul.role = newRole.trim() || `${newName.trim()} agent`;
    agent.soul.goal = newGoal.trim() || `Accomplish tasks as ${newName.trim()}`;
    agent.tools = DEFAULT_TOOLS.map((t) => ({ ...t }));
    registerAgent(agent);
    if ("__TAURI_INTERNALS__" in window) {
      import("@tauri-apps/api/core").then(({ invoke }) => {
        const soulMd = `# ${agent.display.name}\n\n## Role\n${agent.soul.role}\n\n## Goal\n${agent.soul.goal}\n\n## Constraints\n${agent.soul.constraints.map((c) => `- ${c}`).join("\n") || "_None._"}\n`;
        const configYaml = `id: ${agent.id}\nname: ${agent.display.name}\nversion: ${agent.version}\nmodel:\n  provider: ${agent.model.preferred.provider}\n  model_id: ${agent.model.preferred.model_id}\n  temperature: ${agent.model.preferred.temperature}\n  max_tokens: ${agent.model.preferred.max_tokens}\nisolation: ${agent.execution.isolation}\ncolor_class: ${agent.display.color_class}\n`;
        invoke("save_agent", {
          agentId: agent.id,
          soulMd,
          configYaml,
          toolsJson: JSON.stringify(agent.tools, null, 2),
        }).catch(() => {});
      });
    }
    const nodeId = `${agent.id}-${Date.now()}`;
    addNode({
      id: nodeId,
      type: "agent",
      position: { x: 400 + Math.random() * 200, y: 200 + Math.random() * 200 },
      data: {
        manifest: agent,
        status: "idle",
        outputPayloadType: agent.schemas.payload_type,
        inputAcceptTypes: ["*"],
      },
    });
    selectNode(nodeId);
    setNewName("");
    setNewRole("");
    setNewGoal("");
    setNewTeam("gray");
    setShowCreate(false);
  }, [newName, newRole, newGoal, newTeam, registerAgent, addNode, selectNode]);

  const scrollLeftFn = useCallback(() => {
    scrollRef.current?.scrollBy({ left: -SCROLL_AMOUNT, behavior: "smooth" });
  }, []);
  const scrollRightFn = useCallback(() => {
    scrollRef.current?.scrollBy({ left: SCROLL_AMOUNT, behavior: "smooth" });
  }, []);

  return (
    <div className="flex items-center min-h-[105px] h-[105px] overflow-hidden">
      <div className="flex-none w-[160px] flex flex-col gap-2 self-center px-3">
        <PaletteSearch value={search} onChange={setSearch} />
        <button
          onClick={() => setShowCreate(true)}
          className="w-full py-1.5 text-[0.65rem] font-semibold rounded-pill border border-[#898F9C] dark:border-gray-600 text-black dark:text-gray-300 hover:bg-[#4267B2] hover:text-white hover:border-[#4267B2] dark:hover:bg-[#1B3A6B] dark:hover:border-[#1B3A6B] transition-all"
        >
          + Create Agent
        </button>
      </div>

      <button
        onClick={scrollLeftFn}
        className={arrowBtn}
        aria-label="Scroll left"
      >
        <span className="text-black/60 dark:text-white/40 text-2xl font-bold leading-none">
          ‹
        </span>
      </button>

      <div
        ref={scrollRef}
        className="flex-1 min-w-0 flex items-start gap-3 py-2 overflow-x-scroll palette-scrollbar"
      >
        {TEAM_ORDER.filter((t) => grouped[t]?.length).map((team) => (
          <div key={team} className="flex-none flex items-start gap-4 ml-2">
            <div className="flex-none self-center">
              <span
                className="text-[0.6rem] font-bold tracking-widest text-[#898F9C] dark:text-gray-500 uppercase"
                style={{ writingMode: "vertical-lr", textOrientation: "mixed" }}
              >
                {TEAM_LABELS[team] || team}
              </span>
            </div>
            <div className="flex gap-1.5">
              {grouped[team].map((a) => (
                <DraggableAgentCard key={a.id} manifest={a} />
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-caption text-gray-400 self-center px-4">
            No agents found
          </p>
        )}
      </div>

      <button
        onClick={scrollRightFn}
        className={arrowBtn}
        aria-label="Scroll right"
      >
        <span className="text-black/60 dark:text-white/40 text-2xl font-bold leading-none">
          ›
        </span>
      </button>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[#1A1C24] border border-gray-700/50 rounded-node p-5 w-[380px] shadow-2xl">
            <h3 className="text-body-sm font-bold text-white mb-4">
              Create New Agent
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-[0.65rem] font-semibold text-gray-300 block mb-1">
                  Agent Name *
                </label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateAgent()}
                  placeholder="e.g. Researcher, Designer"
                  className="w-full px-3 py-2 text-body-sm rounded-node bg-[#0F1117] border border-gray-700/50 text-white placeholder-gray-600 focus:border-[#1B3A6B] outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[0.65rem] font-semibold text-gray-300 block mb-1">
                  Role (SOUL.md)
                </label>
                <input
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="e.g. Senior Research Analyst"
                  className="w-full px-3 py-2 text-body-sm rounded-node bg-[#0F1117] border border-gray-700/50 text-white placeholder-gray-600 focus:border-[#1B3A6B] outline-none"
                />
              </div>
              <div>
                <label className="text-[0.65rem] font-semibold text-gray-300 block mb-1">
                  Goal (SOUL.md)
                </label>
                <textarea
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  placeholder="e.g. Find sources and synthesize research"
                  rows={2}
                  className="w-full px-3 py-2 text-body-sm rounded-node bg-[#0F1117] border border-gray-700/50 text-white placeholder-gray-600 focus:border-[#1B3A6B] outline-none resize-y"
                />
              </div>
              <div>
                <label className="text-[0.65rem] font-semibold text-gray-300 block mb-1">
                  Team
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {TEAM_OPTIONS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setNewTeam(t.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-[0.65rem] font-medium transition-all ${newTeam === t.id ? "bg-white/10 border border-white/30 text-white" : "border border-gray-700/50 text-gray-500 hover:text-gray-300"}`}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: t.color }}
                      />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[0.6rem] text-gray-500">
                Default tools added. Edit in Inspector after creating.
              </p>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleCreateAgent}
                disabled={!newName.trim()}
                className="flex-1 py-2 text-caption font-semibold rounded-pill bg-[#166534] text-white hover:bg-[#15803d] disabled:opacity-40 transition-colors"
              >
                Create & Add to Canvas
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-caption rounded-pill border border-gray-700/50 text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
