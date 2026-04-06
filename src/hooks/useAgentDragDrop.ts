import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import type { AgentManifest } from "../types/agent";

export function useAgentDragDrop() {
  const { screenToFlowPosition, addNodes } = useReactFlow();

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData("application/multiclawprotocol-agent");
      if (!raw) return;

      const manifest: AgentManifest = JSON.parse(raw);
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNodes({
        id: `${manifest.id}-${Date.now()}`,
        type: "agent",
        position,
        data: {
          manifest,
          status: "idle",
          outputPayloadType: manifest.schemas.payload_type,
          inputAcceptTypes: ["*"],
        },
      });
    },
    [screenToFlowPosition, addNodes],
  );

  return { onDragOver, onDrop };
}
