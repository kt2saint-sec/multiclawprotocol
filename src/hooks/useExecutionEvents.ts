import { useEffect } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useExecutionStore } from "../stores/executionStore";

interface NodeStartedPayload {
  run_id: string;
  node_id: string;
  agent_id: string;
}

interface NodeOutputPayload {
  run_id: string;
  node_id: string;
  line: string;
}

interface NodeCompletedPayload {
  run_id: string;
  node_id: string;
  cost_usd: number;
  tokens_input: number;
  tokens_output: number;
  duration_ms: number;
}

interface NodeErrorPayload {
  run_id: string;
  node_id: string;
  error: string;
}

interface CostUpdatePayload {
  run_id: string;
  total_cost_usd: number;
  budget_remaining: number;
}

type RunnerEventPayload =
  | ({ event: "node-started" } & NodeStartedPayload)
  | ({ event: "node-output" } & NodeOutputPayload)
  | ({ event: "node-completed" } & NodeCompletedPayload)
  | ({ event: "node-error" } & NodeErrorPayload)
  | ({ event: "cost-update" } & CostUpdatePayload);

export function useExecutionEvents() {
  const { updateNodeState, addLog, updateCost, setStatus } =
    useExecutionStore();

  useEffect(() => {
    let unlisten: UnlistenFn | null = null;

    const setup = async () => {
      // Skip when not running inside Tauri
      if (!("__TAURI_INTERNALS__" in window)) return;
      unlisten = await listen<RunnerEventPayload>("runner-event", (event) => {
        const payload = event.payload;

        switch (payload.event) {
          case "node-started":
            updateNodeState(payload.node_id, { status: "execute" });
            addLog({
              level: "info",
              nodeId: payload.node_id,
              message: `Agent ${payload.agent_id} started`,
            });
            break;

          case "node-output":
            addLog({
              level: "debug",
              nodeId: payload.node_id,
              message: payload.line,
            });
            break;

          case "node-completed":
            updateNodeState(payload.node_id, {
              status: "complete",
              costUsd: payload.cost_usd,
              tokensUsed: payload.tokens_input + payload.tokens_output,
              completedAt: new Date().toISOString(),
            });
            updateCost(payload.cost_usd);
            addLog({
              level: "info",
              nodeId: payload.node_id,
              message: `Completed in ${payload.duration_ms}ms ($${payload.cost_usd.toFixed(4)})`,
            });
            break;

          case "node-error":
            updateNodeState(payload.node_id, {
              status: "error",
              errorMessage: payload.error,
              completedAt: new Date().toISOString(),
            });
            addLog({
              level: "error",
              nodeId: payload.node_id,
              message: payload.error,
            });
            break;

          case "cost-update":
            addLog({
              level: "warn",
              nodeId: null,
              message: `Budget alert: $${payload.total_cost_usd.toFixed(4)} spent, $${payload.budget_remaining.toFixed(4)} remaining`,
            });
            break;
        }
      });
    };

    setup();

    return () => {
      if (unlisten) unlisten();
    };
  }, [updateNodeState, addLog, updateCost, setStatus]);
}
