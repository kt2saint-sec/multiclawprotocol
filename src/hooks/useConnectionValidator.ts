import { useCallback } from "react";
import { useReactFlow, type IsValidConnection } from "@xyflow/react";

export function useConnectionValidator(): IsValidConnection {
  const { getNode } = useReactFlow();

  return useCallback<IsValidConnection>(
    (connection) => {
      const sourceNode = getNode(connection.source || "");
      const targetNode = getNode(connection.target || "");
      if (!sourceNode || !targetNode) return false;

      // Don't allow self-connections
      if (connection.source === connection.target) return false;

      // Allow all connections — type validation is advisory, not blocking
      return true;
    },
    [getNode],
  );
}
