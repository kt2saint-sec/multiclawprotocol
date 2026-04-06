import { useCallback, useState } from "react";
import {
  useExecutionStore,
  type RunStatus,
  type AutonomyMode,
} from "../../stores/executionStore";
import { useFlowStore } from "../../stores/flowStore";
import { usePipelineStore } from "../../stores/pipelineStore";

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
    "w-full py-1 text-[0.65rem] font-medium rounded-pill text-center transition-all disabled:opacity-30 disabled:cursor-not-allowed";

  return (
    <div className="flex gap-2 items-center">
      <div className="flex flex-col gap-1 w-[84px]">
        <button
          onClick={handleRun}
          disabled={!canRun || nodes.length === 0}
          className={`${btnBase} bg-[#166534] text-white hover:bg-[#15803d]`}
          title={nodes.length === 0 ? "Add agents first" : "Run pipeline"}
        >
          {status === "running" ? "⟳ Run" : "▶ Run"}
        </button>
        {status === "paused" ? (
          <button
            onClick={handleResume}
            className={`${btnBase} bg-[#166534] text-white hover:bg-[#15803d]`}
            title="Resume"
          >
            ▶ Resume
          </button>
        ) : (
          <button
            onClick={handlePause}
            disabled={!canPause}
            className={`${btnBase} bg-[#92400e] text-white hover:bg-[#b45309]`}
            title="Pause"
          >
            ⏸ Pause
          </button>
        )}
        <button
          onClick={handleStop}
          disabled={!canStop}
          className={`${btnBase} bg-[#991b1b] text-white hover:bg-[#dc2626]`}
          title="Stop"
        >
          ◼ Stop
        </button>
      </div>
      <div className="flex flex-col gap-1 w-[84px]">
        <AutonomySelector />
      </div>
    </div>
  );
}

const AUTONOMY_MODES: { id: AutonomyMode; label: string; title: string }[] = [
  { id: "manual", label: "Manual", title: "Approve every step" },
  { id: "auto", label: "Auto", title: "Run to completion" },
  {
    id: "checkpoint",
    label: "Checkpoint",
    title: "Save checkpoint after each node",
  },
];

function AutonomySelector() {
  const { autonomyMode, setAutonomyMode } = useExecutionStore();
  const [showInfo, setShowInfo] = useState(false);

  const handleSelect = (id: AutonomyMode) => {
    setAutonomyMode(id);
    setShowInfo(id === "manual");
  };

  return (
    <div className="relative flex flex-col gap-1 w-full">
      {AUTONOMY_MODES.map((m) => (
        <button
          key={m.id}
          onClick={() => handleSelect(m.id)}
          title={m.title}
          className={`w-full py-1 text-[0.65rem] font-medium rounded-pill text-center transition-all ${autonomyMode === m.id ? "bg-[#1B3A6B] text-white" : "border border-gray-700/50 text-gray-500 hover:text-gray-300 hover:border-gray-500"}`}
        >
          {m.label}
        </button>
      ))}

      {showInfo && autonomyMode === "manual" && (
        <div className="absolute left-full top-0 ml-2 w-[260px] bg-[#1A1C24] border border-gray-700/50 rounded-node p-3 shadow-lg z-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[0.7rem] font-bold text-white">
              Manual Mode
            </span>
            <button
              onClick={() => setShowInfo(false)}
              className="text-gray-500 hover:text-white text-caption"
            >
              x
            </button>
          </div>
          <p className="text-[0.65rem] text-gray-300 leading-relaxed mb-2">
            Pipeline pauses after each agent. You review output and choose how
            to continue:
          </p>
          <div className="space-y-1.5 text-[0.6rem]">
            <div className="flex gap-2">
              <span className="text-[#4ade80] font-bold flex-none">
                Pass context
              </span>
              <span className="text-gray-400">
                Full output forwarded. Better for complex tasks, costs more
                tokens.
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-[#7dd3fc] font-bold flex-none">
                Fresh start
              </span>
              <span className="text-gray-400">
                You write the prompt. Better for cheap local models.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
