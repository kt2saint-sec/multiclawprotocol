import { useState, useCallback } from "react";
import { useExecutionStore } from "../../stores/executionStore";

async function tauriInvoke(cmd: string): Promise<unknown> {
  if (!("__TAURI_INTERNALS__" in window)) return null;
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke(cmd);
}

export function HitlModal() {
  const { hitlRequest, setHitlRequest } = useExecutionStore();
  const [revisionNote, setRevisionNote] = useState("");
  const [showRevise, setShowRevise] = useState(false);

  const handleApprove = useCallback(async () => {
    try {
      await tauriInvoke("resume_run");
      useExecutionStore.getState().resumeRun();
    } catch (err) {
      console.error("Failed to resume after approval:", err);
    }
    setHitlRequest(null);
  }, [setHitlRequest]);

  const handleReject = useCallback(async () => {
    try {
      await tauriInvoke("cancel_run");
      useExecutionStore.getState().cancelRun();
    } catch (err) {
      console.error("Failed to cancel:", err);
    }
    setHitlRequest(null);
  }, [setHitlRequest]);

  const handleRevise = useCallback(async () => {
    // Log revision note, then resume
    useExecutionStore.getState().addLog({
      level: "info",
      nodeId: hitlRequest?.nodeId ?? null,
      message: `HITL revision: ${revisionNote}`,
    });
    try {
      await tauriInvoke("resume_run");
      useExecutionStore.getState().resumeRun();
    } catch (err) {
      console.error("Failed to resume after revision:", err);
    }
    setRevisionNote("");
    setShowRevise(false);
    setHitlRequest(null);
  }, [hitlRequest, revisionNote, setHitlRequest]);

  if (!hitlRequest) return null;

  const confidenceColor =
    hitlRequest.confidence >= 0.8
      ? "text-status-success"
      : hitlRequest.confidence >= 0.5
        ? "text-amber-500"
        : "text-status-error";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-surface-primary dark:bg-dark-surface-primary rounded-lg shadow-2xl w-[520px] max-h-[80vh] overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-body font-bold text-surface-accent dark:text-gray-100">
            Human Approval Required
          </h2>
          <p className="text-caption text-gray-500 mt-1">
            Node:{" "}
            <span className="font-mono text-purple-400">
              {hitlRequest.nodeId}
            </span>
          </p>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3 overflow-y-auto max-h-[50vh]">
          {/* Confidence */}
          <div className="flex items-center justify-between">
            <span className="text-caption text-gray-500">Confidence</span>
            <span className={`text-body font-bold ${confidenceColor}`}>
              {(hitlRequest.confidence * 100).toFixed(0)}%
            </span>
          </div>

          {/* Cost so far */}
          <div className="flex items-center justify-between">
            <span className="text-caption text-gray-500">Cost so far</span>
            <span className="text-body font-mono text-gray-300">
              ${hitlRequest.costSoFar.toFixed(4)}
            </span>
          </div>

          {/* Evidence */}
          <div>
            <span className="text-caption text-gray-500 block mb-1">
              Evidence
            </span>
            <pre className="text-caption font-mono bg-gray-50 dark:bg-gray-900 rounded p-3 overflow-x-auto text-gray-400 max-h-[200px] overflow-y-auto">
              {JSON.stringify(hitlRequest.evidence, null, 2)}
            </pre>
          </div>

          {/* Revision input */}
          {showRevise && (
            <div>
              <label className="text-caption text-gray-500 block mb-1">
                Revision notes
              </label>
              <textarea
                value={revisionNote}
                onChange={(e) => setRevisionNote(e.target.value)}
                placeholder="Describe what should be changed..."
                className="w-full h-20 text-caption font-mono bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded p-2 text-gray-300 placeholder-gray-500 resize-none"
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center gap-3">
          <button
            onClick={handleApprove}
            className="px-4 py-2 text-caption font-medium rounded-pill bg-status-success text-white hover:brightness-110 transition-all"
          >
            Approve
          </button>
          {!showRevise ? (
            <button
              onClick={() => setShowRevise(true)}
              className="px-4 py-2 text-caption font-medium rounded-pill border border-amber-400 text-amber-400 hover:bg-amber-400/10 transition-all"
            >
              Revise
            </button>
          ) : (
            <button
              onClick={handleRevise}
              disabled={!revisionNote.trim()}
              className="px-4 py-2 text-caption font-medium rounded-pill bg-amber-500 text-white hover:brightness-110 disabled:opacity-40 transition-all"
            >
              Submit Revision
            </button>
          )}
          <button
            onClick={handleReject}
            className="px-4 py-2 text-caption font-medium rounded-pill border border-red-400 text-red-400 hover:bg-red-400/10 transition-all ml-auto"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}
