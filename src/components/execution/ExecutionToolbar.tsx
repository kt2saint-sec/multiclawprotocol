import { useCallback } from "react";
import {
  useExecutionStore,
  type RunStatus,
  type AutonomyMode,
} from "../../stores/executionStore";
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
      {/* Run — green */}
      <button
        onClick={handleRun}
        disabled={!canRun || nodes.length === 0}
        className={`${btnBase} bg-[#166534] text-white hover:bg-[#15803d]`}
        title={
          nodes.length === 0 ? "Add agents to the canvas first" : "Run pipeline"
        }
      >
        {status === "running" ? "⟳ Run" : "▶ Run"}
      </button>

      {/* Pause — orange */}
      {status === "paused" ? (
        <button
          onClick={handleResume}
          className={`${btnBase} bg-[#166534] text-white hover:bg-[#15803d]`}
          title="Resume execution"
        >
          ▶ Resume
        </button>
      ) : (
        <button
          onClick={handlePause}
          disabled={!canPause}
          className={`${btnBase} bg-[#92400e] text-white hover:bg-[#b45309]`}
          title="Pause execution"
        >
          ⏸ Pause
        </button>
      )}

      {/* Stop — red */}
      <button
        onClick={handleStop}
        disabled={!canStop}
        className={`${btnBase} bg-[#991b1b] text-white hover:bg-[#dc2626]`}
        title="Stop execution"
      >
        ◼ Stop
      </button>

      <span className={`text-caption ${statusInfo.color} ml-1`}>
        {statusInfo.label}
      </span>

      {/* Autonomy mode selector */}
      <div className="w-px h-5 bg-gray-700/50 mx-1" />
      <AutonomySelector />
    </div>
  );
}

const AUTONOMY_MODES: { id: AutonomyMode; label: string; title: string }[] = [
  { id: "manual", label: "Manual", title: "Approve every step" },
  { id: "auto", label: "Auto", title: "Run to completion" },
  { id: "checkpoint", label: "Ckpt", title: "Save checkpoint after each node" },
];

function AutonomySelector() {
  const { autonomyMode, setAutonomyMode } = useExecutionStore();

  return (
    <div className="flex items-center gap-0.5 bg-[#0F1117] rounded-pill p-0.5">
      {AUTONOMY_MODES.map((m) => (
        <button
          key={m.id}
          onClick={() => setAutonomyMode(m.id)}
          title={m.title}
          className={`px-2 py-1 text-[0.6rem] font-medium rounded-pill transition-all ${
            autonomyMode === m.id
              ? "bg-red-600 text-white"
              : "text-gray-500 hover:text-gray-300"
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
