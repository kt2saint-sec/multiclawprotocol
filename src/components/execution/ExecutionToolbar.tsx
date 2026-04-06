import { useCallback } from "react";
import { useExecutionStore, type RunStatus } from "../../stores/executionStore";
import { useFlowStore } from "../../stores/flowStore";
import { usePipelineStore } from "../../stores/pipelineStore";

// Tauri invoke — no-op outside Tauri
async function tauriInvoke(
  cmd: string,
  args?: Record<string, unknown>,
): Promise<unknown> {
  if (!("__TAURI_INTERNALS__" in window)) return null;
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke(cmd, args);
}

const STATUS_CONFIG: Record<RunStatus, { label: string; color: string }> = {
  idle: { label: "Ready", color: "text-gray-500" },
  pending: { label: "Pending...", color: "text-amber-500" },
  validating: { label: "Validating...", color: "text-amber-500" },
  running: { label: "Running", color: "text-status-success" },
  paused: { label: "Paused", color: "text-amber-500" },
  completed: { label: "Completed", color: "text-status-success" },
  error: { label: "Error", color: "text-status-error" },
};

export function ExecutionToolbar() {
  const { status, startRun } = useExecutionStore();
  const { nodes, edges } = useFlowStore();
  const { pipeline } = usePipelineStore();

  const canRun =
    status === "idle" || status === "completed" || status === "error";
  const canPause = status === "running";
  const canResume = status === "paused";
  const canStop = status === "running" || status === "paused";

  const handleRun = useCallback(async () => {
    if (!canRun || nodes.length === 0) return;

    const budget = pipeline?.budget ?? { max_cost_usd: 2.0, warn_at_usd: 1.5 };

    const request = {
      pipeline_id: pipeline?.id ?? crypto.randomUUID(),
      nodes: nodes.map((n) => ({
        id: n.id,
        agent_id:
          (n.data as { manifest?: { id?: string } })?.manifest?.id ?? n.id,
        timeout_secs: 600,
      })),
      edges: edges.map((e) => ({ from: e.source, to: e.target })),
      budget_max_usd: budget.max_cost_usd,
      budget_warn_usd: budget.warn_at_usd ?? budget.max_cost_usd * 0.75,
      max_parallel: pipeline?.execution_config?.max_parallel_nodes ?? 2,
      on_budget_exceeded: "pause_and_notify",
    };

    try {
      const runId = (await tauriInvoke("start_run", { request })) as
        | string
        | null;
      if (runId) startRun(runId);
    } catch (err) {
      console.error("Failed to start run:", err);
    }
  }, [canRun, nodes, edges, pipeline, startRun]);

  const handlePause = useCallback(async () => {
    if (!canPause) return;
    try {
      await tauriInvoke("pause_run");
      useExecutionStore.getState().pauseRun();
    } catch (err) {
      console.error("Failed to pause:", err);
    }
  }, [canPause]);

  const handleResume = useCallback(async () => {
    if (!canResume) return;
    try {
      await tauriInvoke("resume_run");
      useExecutionStore.getState().resumeRun();
    } catch (err) {
      console.error("Failed to resume:", err);
    }
  }, [canResume]);

  const handleStop = useCallback(async () => {
    if (!canStop) return;
    try {
      await tauriInvoke("cancel_run");
      useExecutionStore.getState().cancelRun();
    } catch (err) {
      console.error("Failed to cancel:", err);
    }
  }, [canStop]);

  const statusInfo = STATUS_CONFIG[status];

  const btnBase =
    "w-20 py-1.5 text-caption font-medium rounded-pill text-center transition-all disabled:opacity-30 disabled:cursor-not-allowed";

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={handleRun}
        disabled={!canRun || nodes.length === 0}
        className={`${btnBase} bg-[#1B3A6B] text-white hover:bg-[#1E40AF]`}
        title={
          nodes.length === 0 ? "Add agents to the canvas first" : "Run pipeline"
        }
      >
        {status === "running" ? "⟳ Run" : "▶ Run"}
      </button>

      {status === "paused" ? (
        <button
          onClick={handleResume}
          className={`${btnBase} border border-[#166534] text-[#4ade80] hover:bg-[#166534]/20`}
          title="Resume execution"
        >
          ▶ Resume
        </button>
      ) : (
        <button
          onClick={handlePause}
          disabled={!canPause}
          className={`${btnBase} border border-gray-600 text-gray-400 hover:bg-gray-800`}
          title="Pause execution"
        >
          ⏸ Pause
        </button>
      )}

      <button
        onClick={handleStop}
        disabled={!canStop}
        className={`${btnBase} border border-gray-600 text-gray-400 hover:border-red-500 hover:text-red-400`}
        title="Stop execution"
      >
        ◼ Stop
      </button>

      <span className={`text-caption ${statusInfo.color} ml-1`}>
        {statusInfo.label}
      </span>
    </div>
  );
}
