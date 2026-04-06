import { useEffect, useRef, useState } from "react";
import { useExecutionStore, type LogEntry } from "../../stores/executionStore";

const LEVEL_COLORS: Record<LogEntry["level"], string> = {
  info: "text-blue-400",
  warn: "text-amber-400",
  error: "text-red-400",
  debug: "text-gray-500",
};

const LEVEL_BADGES: Record<LogEntry["level"], string> = {
  info: "bg-blue-500/20 text-blue-400",
  warn: "bg-amber-500/20 text-amber-400",
  error: "bg-red-500/20 text-red-400",
  debug: "bg-gray-500/20 text-gray-500",
};

export function LogStream() {
  const { logs, status } = useExecutionStore();
  const [autoScroll, setAutoScroll] = useState(true);
  const [levelFilter, setLevelFilter] = useState<Set<LogEntry["level"]>>(
    new Set(["info", "warn", "error", "debug"]),
  );
  const [nodeFilter, setNodeFilter] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const toggleLevel = (level: LogEntry["level"]) => {
    setLevelFilter((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  };

  // Collect unique node IDs for filter dropdown
  const nodeIds = [
    ...new Set(logs.map((l) => l.nodeId).filter(Boolean)),
  ] as string[];

  const filtered = logs.filter((l) => {
    if (!levelFilter.has(l.level)) return false;
    if (nodeFilter && l.nodeId !== nodeFilter) return false;
    return true;
  });

  if (status === "idle" && logs.length === 0) {
    return (
      <div className="font-mono text-caption text-gray-500 bg-gray-50 dark:bg-gray-900 rounded p-3 h-full">
        <p className="text-gray-400">
          No logs yet — run the pipeline to see output
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="flex items-center gap-2 pb-2 flex-wrap">
        {(["info", "warn", "error", "debug"] as const).map((level) => (
          <button
            key={level}
            onClick={() => toggleLevel(level)}
            className={`text-caption px-1.5 py-0.5 rounded transition-opacity
              ${LEVEL_BADGES[level]}
              ${levelFilter.has(level) ? "opacity-100" : "opacity-30"}`}
          >
            {level}
          </button>
        ))}

        {nodeIds.length > 0 && (
          <select
            value={nodeFilter ?? ""}
            onChange={(e) => setNodeFilter(e.target.value || null)}
            className="text-caption bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5"
          >
            <option value="">All nodes</option>
            {nodeIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        )}

        <label className="flex items-center gap-1 text-caption text-gray-500 ml-auto cursor-pointer">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="w-3 h-3"
          />
          Auto-scroll
        </label>
      </div>

      {/* Log entries */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto font-mono text-caption bg-gray-50 dark:bg-gray-900 rounded p-2 space-y-0.5"
      >
        {filtered.map((log, i) => {
          const time = new Date(log.timestamp).toLocaleTimeString("en-US", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
          return (
            <div
              key={i}
              className="flex gap-2 leading-5 hover:bg-gray-100 dark:hover:bg-gray-800/50 px-1 rounded"
            >
              <span className="text-gray-400 shrink-0">{time}</span>
              <span
                className={`shrink-0 w-10 text-right ${LEVEL_COLORS[log.level]}`}
              >
                {log.level}
              </span>
              {log.nodeId && (
                <span className="shrink-0 text-purple-400 truncate max-w-[80px]">
                  {log.nodeId}
                </span>
              )}
              <span className="text-gray-300 dark:text-gray-400 break-all">
                {log.message}
              </span>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-gray-500 text-center py-4">No matching logs</p>
        )}
      </div>
    </div>
  );
}
