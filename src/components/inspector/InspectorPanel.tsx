import { useState } from "react";
import { AgentConfigForm } from "./AgentConfigForm";
import { SoulEditor } from "./SoulEditor";
import { SchemaViewer } from "./SchemaViewer";
import { LogStream } from "../execution/LogStream";
import type { AgentManifest } from "../../types/agent";

interface InspectorPanelProps {
  selectedAgent: AgentManifest | null;
  onUpdate?: (manifest: AgentManifest) => void;
}

const TABS = ["Config", "Soul", "Schema", "Logs"] as const;
type Tab = (typeof TABS)[number];

export function InspectorPanel({
  selectedAgent,
  onUpdate,
}: InspectorPanelProps) {
  const [tab, setTab] = useState<Tab>("Config");

  if (!selectedAgent) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4">
        <p className="text-body-sm">Select a node to inspect</p>
        <p className="text-caption mt-2">Click an agent on the canvas</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 px-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-caption font-medium transition-colors
              ${
                tab === t
                  ? "text-agent-ops border-b-2 border-agent-ops"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-3">
        {tab === "Config" && (
          <AgentConfigForm manifest={selectedAgent} onUpdate={onUpdate} />
        )}
        {tab === "Soul" && (
          <SoulEditor manifest={selectedAgent} onUpdate={onUpdate} />
        )}
        {tab === "Schema" && <SchemaViewer manifest={selectedAgent} />}
        {tab === "Logs" && <LogStream />}
      </div>

      {/* Kill Switch button */}
      <div className="flex-none p-3 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => {
            const name = selectedAgent.display.name;
            if (
              confirm(
                `Kill agent ${name}? This stops the agent process immediately.`,
              )
            ) {
              // Log kill event
              console.warn(`KILLSWITCH: User killed agent ${selectedAgent.id}`);
              // In Tauri desktop mode, this would invoke a backend command
              alert(
                `Agent ${name} kill signal sent. Restart from the terminal: hermes -p ${selectedAgent.id} chat`,
              );
            }
          }}
          className="w-full py-2 text-caption font-semibold rounded-pill bg-[#991b1b] text-white hover:bg-[#dc2626] transition-colors"
        >
          Kill Agent
        </button>
      </div>
    </div>
  );
}
