import { useState, useMemo } from "react";
import { PaletteSearch } from "./PaletteSearch";
import { DraggableAgentCard } from "./DraggableAgentCard";
import { useAgentRegistryStore } from "../../stores/agentRegistryStore";

const TEAM_ORDER = ["blue", "green", "amber", "purple", "red", "gray"];
const TEAM_LABELS: Record<string, string> = {
  blue: "Research",
  green: "Development",
  amber: "Intelligence",
  purple: "Solo",
  red: "Executor",
  gray: "Evaluator",
};

export function AgentPalette() {
  const [search, setSearch] = useState("");
  const agentsMap = useAgentRegistryStore((s) => s.agents);
  const agents = useMemo(() => Object.values(agentsMap), [agentsMap]);

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

  return (
    <div className="flex flex-col h-full">
      <div className="p-3">
        <PaletteSearch value={search} onChange={setSearch} />
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-3">
        {TEAM_ORDER.filter((t) => grouped[t]?.length).map((team) => (
          <div key={team}>
            <div className="text-caption text-gray-500 uppercase tracking-widest px-1 mb-1">
              {TEAM_LABELS[team] || team}
            </div>
            <div className="space-y-0.5">
              {grouped[team].map((a) => (
                <DraggableAgentCard key={a.id} manifest={a} />
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-caption text-gray-400 text-center py-8">
            No agents found
          </p>
        )}
      </div>
    </div>
  );
}
