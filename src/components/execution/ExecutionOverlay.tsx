import { useEffect } from "react";
import { useExecutionStore } from "../../stores/executionStore";
import { useFlowStore } from "../../stores/flowStore";

/**
 * Syncs execution state into React Flow node data and edge animations.
 * Headless component — renders nothing, just syncs state.
 */
export function ExecutionOverlay() {
  const nodeStates = useExecutionStore((s) => s.nodeStates);
  const status = useExecutionStore((s) => s.status);
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const setNodes = useFlowStore((s) => s.setNodes);
  const setEdges = useFlowStore((s) => s.setEdges);

  // Sync node execution status
  useEffect(() => {
    if (status === "idle") return;

    const updated = nodes.map((node) => {
      const execState = nodeStates[node.id];
      if (!execState) return node;

      const currentStatus = (node.data as Record<string, unknown>)?.status;
      if (currentStatus === mapStatus(execState.status)) return node;

      return {
        ...node,
        data: {
          ...node.data,
          status: mapStatus(execState.status),
        },
      };
    });

    const changed = updated.some((n, i) => n !== nodes[i]);
    if (changed) setNodes(updated);
  }, [nodeStates, status, nodes, setNodes]);

  // Animate edges connected to running nodes
  useEffect(() => {
    if (status === "idle") return;

    const runningNodeIds = new Set(
      Object.entries(nodeStates)
        .filter(([, s]) => mapStatus(s.status) === "running")
        .map(([id]) => id),
    );

    const updated = edges.map((edge) => {
      const shouldAnimate =
        runningNodeIds.has(edge.source) || runningNodeIds.has(edge.target);
      if (edge.animated === shouldAnimate) return edge;
      return { ...edge, animated: shouldAnimate };
    });

    const changed = updated.some((e, i) => e !== edges[i]);
    if (changed) setEdges(updated);
  }, [nodeStates, status, edges, setEdges]);

  return null;
}

/** Map execution NodeStatus to AgentNode's simpler status type */
function mapStatus(
  execStatus: string,
): "idle" | "running" | "success" | "error" {
  switch (execStatus) {
    case "execute":
    case "validate":
    case "collect":
    case "init":
      return "running";
    case "complete":
    case "pass":
      return "success";
    case "error":
      return "error";
    default:
      return "idle";
  }
}
