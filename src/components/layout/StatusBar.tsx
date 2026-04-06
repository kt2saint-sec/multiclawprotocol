import { useEffect, useState } from "react";
import { useRouterHealth } from "../../hooks/useRouterHealth";
import { useExecutionStore } from "../../stores/executionStore";
import { CostTicker } from "../execution/CostTicker";

export function StatusBar() {
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const { health } = useRouterHealth();
  const { status, totalCostUsd } = useExecutionStore();

  useEffect(() => {
    const interval = setInterval(
      () => setTime(new Date().toLocaleTimeString()),
      1000,
    );
    return () => clearInterval(interval);
  }, []);

  const ollamaIndicator = health.ollama_connected
    ? "bg-status-success"
    : "bg-status-error";

  const litellmIndicator = health.litellm_connected
    ? "bg-status-success"
    : "bg-status-warning";

  const loadedModelNames = health.loaded_models.map((m) => m.name).join(", ");

  return (
    <div className="flex items-center justify-between px-4 h-8 text-caption text-gray-500 dark:text-gray-400 bg-surface-secondary dark:bg-dark-surface-secondary">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${ollamaIndicator} inline-block`}
          />
          Ollama: {health.ollama_connected ? "connected" : "offline"}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${litellmIndicator} inline-block`}
          />
          LiteLLM: {health.litellm_connected ? "ready" : "offline"}
        </span>
        {loadedModelNames && (
          <span className="text-gray-400 dark:text-gray-500 truncate max-w-[200px]">
            Loaded: {loadedModelNames}
          </span>
        )}
        <span>{health.available_models.length} models</span>
      </div>
      <div className="flex items-center gap-4">
        <CostTicker />
        {status !== "idle" && (
          <span className="flex items-center gap-1.5">
            {status === "running" && (
              <span className="w-2 h-2 rounded-full bg-status-warning animate-pulse inline-block" />
            )}
            Run: {status}
          </span>
        )}
        <span>{time}</span>
      </div>
    </div>
  );
}
