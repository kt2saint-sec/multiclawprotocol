import { useState, useMemo } from "react";
import { PaletteSearch } from "./PaletteSearch";
import { DraggableAgentCard } from "./DraggableAgentCard";
import { useAgentRegistryStore } from "../../stores/agentRegistryStore";

const TEAM_ORDER = ["blue", "green", "amber", "purple", "red", "gray"];
const TEAM_LABELS: Record<string, string> = {
  blue: "The Brain",
  green: "The Forge",
  amber: "The Hustle",
  purple: "Solo Agents",
  red: "Supervisors",
  gray: "Utility",
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
    <div className="flex items-start gap-3 px-3 py-2 overflow-x-auto">
      {/* Search - compact for horizontal layout */}
      <div className="flex-none w-[160px] self-center">
        <PaletteSearch value={search} onChange={setSearch} />
      </div>

      {/* Agent cards grouped by team, scrolling horizontally */}
      {TEAM_ORDER.filter((t) => grouped[t]?.length).map((team) => (
        <div key={team} className="flex-none flex items-start gap-2">
          {/* Team label - vertical */}
          <div className="flex-none self-center">
            <span
              className="text-[0.6rem] font-bold tracking-widest text-gray-500 uppercase"
              style={{ writingMode: "vertical-lr", textOrientation: "mixed" }}
            >
              {TEAM_LABELS[team] || team}
            </span>
          </div>
          {/* Cards */}
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
  );
}
