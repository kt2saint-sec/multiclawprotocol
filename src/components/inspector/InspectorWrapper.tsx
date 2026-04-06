import { useCallback } from "react";
import { useFlowStore } from "../../stores/flowStore";
import { InspectorPanel } from "./InspectorPanel";
import type { AgentManifest } from "../../types/agent";

/**
 * Connects the InspectorPanel to the canvas selection.
 * Reads selectedNodeId from flowStore, extracts the agent manifest
 * from node data, and wires onUpdate to push changes back into the node.
 */
export function InspectorWrapper() {
  const selectedNodeId = useFlowStore((s) => s.selectedNodeId);
  const nodes = useFlowStore((s) => s.nodes);
  const setNodes = useFlowStore((s) => s.setNodes);

  const selectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId)
    : null;

  const manifest = selectedNode
    ? ((selectedNode.data as { manifest?: AgentManifest })?.manifest ?? null)
    : null;

  const handleUpdate = useCallback(
    (updated: AgentManifest) => {
      if (!selectedNodeId) return;
      setNodes(
        nodes.map((n) =>
          n.id === selectedNodeId
            ? { ...n, data: { ...n.data, manifest: updated } }
            : n,
        ),
      );
    },
    [selectedNodeId, nodes, setNodes],
  );

  return <InspectorPanel selectedAgent={manifest} onUpdate={handleUpdate} />;
}
