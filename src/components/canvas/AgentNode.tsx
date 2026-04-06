import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useFlowStore } from "../../stores/flowStore";
import type { AgentManifest } from "../../types/agent";

const TEAM_COLORS: Record<string, string> = {
  blue: "#1B3A6B",
  green: "#1A5632",
  amber: "#FFB347",
  purple: "#6B21A8",
  red: "#DC2626",
  gray: "#4B5563",
};

interface AgentNodeData {
  manifest: AgentManifest;
  status: "idle" | "running" | "success" | "error";
  outputPayloadType?: string;
  inputAcceptTypes?: string[];
}

function AgentNodeComponent({
  id,
  data,
  selected,
}: NodeProps & { id: string; data: AgentNodeData }) {
  const [expanded, setExpanded] = useState(false);
  const removeNode = useFlowStore((s) => s.removeNode);
  const { manifest, status } = data;
  const borderColor =
    TEAM_COLORS[manifest.display.color_class] ||
    manifest.display.color_hex ||
    "#6B7280";

  const statusColors = {
    idle: "bg-status-idle",
    running: "bg-status-running animate-pulse-slow",
    success: "bg-status-success",
    error: "bg-status-error",
  };

  return (
    <div
      className={`bg-surface-primary dark:bg-dark-surface-primary rounded-node shadow-node
        ${selected ? "shadow-node-active" : "hover:shadow-node-hover"}
        ${expanded ? "w-[360px]" : "w-[280px]"}
        transition-all duration-200 cursor-pointer`}
      style={{ borderLeft: `4px solid ${borderColor}` }}
      onDoubleClick={() => setExpanded(!expanded)}
    >
      {/* Input handle — large, visible, glowing on hover */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-4 !h-4 !bg-[#1E40AF] !border-2 !border-[#7dd3fc] hover:!bg-[#7dd3fc] hover:!scale-125 !transition-all"
      />

      {/* Header — name + model + delete */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-3 h-3 rounded-full flex-none ${statusColors[status]}`}
          />
          <span className="text-body-lg font-bold text-surface-accent dark:text-white truncate tracking-tight">
            {manifest.display.name}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-none">
          <span className="text-body-sm text-gray-500 dark:text-gray-400 truncate max-w-[120px] font-mono">
            {manifest.model.preferred.model_id.split("/").pop()}
          </span>
          {/* Delete button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeNode(id);
            }}
            className="w-5 h-5 flex items-center justify-center rounded text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors text-caption"
            title="Remove from pipeline"
          >
            x
          </button>
        </div>
      </div>

      {/* Collapsed: payload type */}
      {!expanded && (
        <div className="px-4 pb-3">
          <span className="text-body-sm text-gray-400">
            {manifest.schemas.payload_type}
          </span>
        </div>
      )}

      {/* Expanded: full config */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-gray-200 dark:border-gray-700 mt-1 pt-2 space-y-2">
          <div>
            <span className="text-caption text-gray-500">Role</span>
            <p className="text-body-sm text-gray-700 dark:text-gray-300">
              {manifest.soul.role}
            </p>
          </div>
          <div>
            <span className="text-caption text-gray-500">Tools</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {manifest.tools
                .filter((t) => t.enabled)
                .map((t) => (
                  <span
                    key={t.id}
                    className="text-caption px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                  >
                    {t.id}
                  </span>
                ))}
            </div>
          </div>
          <div>
            <span className="text-caption text-gray-500">I/O</span>
            <p className="text-caption text-gray-400">
              in: {Object.keys(manifest.schemas.input).length} fields | out:{" "}
              {manifest.schemas.payload_type}
            </p>
          </div>
        </div>
      )}

      {/* Output handle — large, visible, glowing on hover */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-4 !h-4 !bg-[#166534] !border-2 !border-[#4ade80] hover:!bg-[#4ade80] hover:!scale-125 !transition-all"
      />
    </div>
  );
}

export const AgentNode = memo(AgentNodeComponent);
export type { AgentNodeData };
