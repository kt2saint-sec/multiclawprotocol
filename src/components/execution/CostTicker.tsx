import { useExecutionStore } from "../../stores/executionStore";
import { usePipelineStore } from "../../stores/pipelineStore";

export function CostTicker() {
  const { totalCostUsd, status } = useExecutionStore();
  const { pipeline } = usePipelineStore();

  const budgetMax = pipeline?.budget?.max_cost_usd ?? 2.0;
  const percent = budgetMax > 0 ? (totalCostUsd / budgetMax) * 100 : 0;

  const barColor =
    percent > 95
      ? "bg-status-error animate-pulse"
      : percent > 80
        ? "bg-status-error"
        : percent > 50
          ? "bg-status-warning"
          : "bg-status-success";

  if (status === "idle") return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-caption text-gray-500 dark:text-gray-400">
        ${totalCostUsd.toFixed(4)}
      </span>
      <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <span className="text-caption text-gray-400 dark:text-gray-500">
        ${budgetMax.toFixed(2)}
      </span>
    </div>
  );
}
