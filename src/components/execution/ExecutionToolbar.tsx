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

  return (
    <div className="flex items-center gap-2">
      {/* Run button */}
      <button
        onClick={handleRun}
        disabled={!canRun || nodes.length === 0}
        className="btn-cart text-caption px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
        title={
          nodes.length === 0 ? "Add agents to the canvas first" : "Run pipeline"
        }
      >
        {status === "running" ? "⟳" : "▶"} Run
      </button>

      {/* Pause button */}
      <button
        onClick={handlePause}
        disabled={!canPause}
        className="px-3 py-1.5 text-caption rounded-pill border border-gray-300 dark:border-gray-600
          hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:opacity-30 disabled:cursor-not-allowed
          transition-colors"
        title="Pause execution"
      >
        ⏸ Pause
      </button>

      {/* Resume button */}
      {status === "paused" && (
        <button
          onClick={handleResume}
          className="px-3 py-1.5 text-caption rounded-pill border border-green-400 dark:border-green-600
            hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
          title="Resume execution"
        >
          ▶ Resume
        </button>
      )}

      {/* Stop button */}
      <button
        onClick={handleStop}
        disabled={!canStop}
        className="px-3 py-1.5 text-caption rounded-pill border border-red-300 dark:border-red-600
          hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-30 disabled:cursor-not-allowed
          transition-colors"
        title="Stop execution"
      >
        ◼ Stop
      </button>

      {/* Status indicator */}
      <span className={`text-caption ${statusInfo.color} ml-2`}>
        {statusInfo.label}
      </span>
    </div>
  );
}
