import { useState, useEffect, useMemo } from "react";
import { useExecutionStore, type LogEntry } from "../../stores/executionStore";
import {
  type UnifiedLogEntry,
  parseErrorsLog,
  parseTokenUsage,
  parseKillswitchLog,
  mergeAndSort,
  fetchLogFile,
} from "./LogParser";

const LEVEL_COLORS: Record<string, string> = {
  error: "text-red-400",
  warn: "text-amber-400",
  info: "text-blue-400",
  debug: "text-gray-500",
};

const LEVEL_BG: Record<string, string> = {
  error: "bg-red-500/15",
  warn: "bg-amber-500/15",
  info: "bg-blue-500/10",
  debug: "bg-gray-500/10",
};

const SOURCE_COLORS: Record<string, string> = {
  hermes: "text-purple-400",
  openrouter: "text-cyan-400",
  ollama: "text-green-400",
  killswitch: "text-red-400",
  pipeline: "text-blue-400",
  docker: "text-amber-400",
};

// Log file paths — resolved at runtime via $HOME, no hardcoded user paths
const HOME = typeof process !== "undefined" ? process.env.HOME : undefined;
const LOG_PATHS = {
  errors: `${HOME || "~"}/.hermes/logs/errors.log`,
  tokens: `${HOME || "~"}/.hermes/logs/token_usage.jsonl`,
  killswitch: `${HOME || "~"}/.multiclawprotocol/logs/killswitch.log`,
};

const POLL_INTERVAL = 5000;

export function LogViewerPage() {
  const [fileLogs, setFileLogs] = useState<UnifiedLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<string>("");

  // Filters
  const [levelFilter, setLevelFilter] = useState<Set<string>>(
    new Set(["error", "warn", "info", "debug"]),
  );
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [agentFilter, setAgentFilter] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");

  // Live pipeline logs from executionStore
  const pipelineLogs = useExecutionStore((s) => s.logs);

  // Load log files
  const loadLogs = async () => {
    const results: UnifiedLogEntry[] = [];

    try {
      const errContent = await fetchLogFile(LOG_PATHS.errors);
      if (errContent) results.push(...parseErrorsLog(errContent));
    } catch { /* skip */ }

    try {
      const tokContent = await fetchLogFile(LOG_PATHS.tokens);
      if (tokContent) results.push(...parseTokenUsage(tokContent));
    } catch { /* skip */ }

    try {
      const ksContent = await fetchLogFile(LOG_PATHS.killswitch);
      if (ksContent) results.push(...parseKillswitchLog(ksContent));
    } catch { /* skip */ }

    setFileLogs(results);
    setLoading(false);
    setLastRefresh(new Date().toLocaleTimeString());
  };

  // Initial load + polling
  useEffect(() => {
    void (async () => { await loadLogs(); })();
    const interval = setInterval(() => { void loadLogs(); }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // Convert pipeline logs to unified format
  const liveLogs: UnifiedLogEntry[] = pipelineLogs.map((l: LogEntry, i: number) => ({
    id: `pipe-${i}`,
    timestamp: l.timestamp,
    level: l.level,
    source: "pipeline" as const,
    agent: l.nodeId || "pipeline",
    message: l.message,
  }));

  // Merge all sources
  const allLogs = useMemo(
    () => mergeAndSort([...fileLogs, ...liveLogs]),
    [fileLogs, liveLogs],
  );

  // Apply filters
  const filtered = useMemo(() => {
    return allLogs.filter((log) => {
      if (!levelFilter.has(log.level)) return false;
      if (sourceFilter && log.source !== sourceFilter) return false;
      if (agentFilter && log.agent !== agentFilter) return false;
      if (searchText && !log.message.toLowerCase().includes(searchText.toLowerCase()))
        return false;
      return true;
    });
  }, [allLogs, levelFilter, sourceFilter, agentFilter, searchText]);

  // Unique agents and sources for filter dropdowns
  const agents = useMemo(
    () => [...new Set(allLogs.map((l) => l.agent))].sort(),
    [allLogs],
  );
  const sources = useMemo(
    () => [...new Set(allLogs.map((l) => l.source))].sort(),
    [allLogs],
  );

  const toggleLevel = (level: string) => {
    setLevelFilter((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  };

  // Stats
  const errorCount = allLogs.filter((l) => l.level === "error").length;
  const warnCount = allLogs.filter((l) => l.level === "warn").length;
  const totalCost = allLogs.reduce((sum, l) => sum + (l.cost || 0), 0);

  return (
    <div className="h-full flex bg-[#0F1117]">
      {/* Left: Log stream */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Stats bar */}
        <div className="flex items-center gap-4 px-4 py-2 border-b border-gray-800/50 flex-none">
          <span className="text-body-sm font-bold text-white">Agent Logs</span>
          <span className="text-caption text-red-400">{errorCount} errors</span>
          <span className="text-caption text-amber-400">{warnCount} warnings</span>
          <span className="text-caption text-cyan-400">${totalCost.toFixed(4)} spent</span>
          <span className="text-caption text-gray-600 ml-auto">
            {filtered.length} / {allLogs.length} entries
            {lastRefresh && ` · ${lastRefresh}`}
          </span>
          <button
            onClick={loadLogs}
            className="text-caption text-gray-500 hover:text-gray-300 transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Log entries */}
        <div className="flex-1 overflow-y-auto font-mono text-caption">
          {loading && (
            <div className="flex items-center justify-center h-32 text-gray-500">
              Loading logs...
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="flex items-center justify-center h-32 text-gray-500">
              {allLogs.length === 0
                ? "No log files found. Logs appear when agents run."
                : "No logs match current filters."}
            </div>
          )}

          {filtered.map((log) => (
            <div
              key={log.id}
              className={`flex items-start gap-3 px-4 py-1.5 border-b border-gray-800/20 hover:bg-gray-800/30 ${LEVEL_BG[log.level]}`}
            >
              {/* Timestamp */}
              <span className="text-gray-600 flex-none w-[140px] truncate">
                {formatTimestamp(log.timestamp)}
              </span>

              {/* Level badge */}
              <span className={`flex-none w-[45px] font-semibold ${LEVEL_COLORS[log.level]}`}>
                {log.level.toUpperCase()}
              </span>

              {/* Source badge */}
              <span className={`flex-none w-[80px] ${SOURCE_COLORS[log.source] || "text-gray-500"}`}>
                {log.source}
              </span>

              {/* Agent */}
              <span className="flex-none w-[100px] text-purple-300 truncate">
                {log.agent}
              </span>

              {/* Message */}
              <span className="text-gray-300 break-all min-w-0">
                {log.message}
              </span>

              {/* Cost */}
              {log.cost !== undefined && log.cost > 0 && (
                <span className="flex-none text-cyan-400 ml-auto">
                  ${log.cost.toFixed(6)}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right: Filters */}
      <div className="w-[240px] flex-none border-l border-gray-800/50 p-4 space-y-5 overflow-y-auto">
        <h3 className="text-caption font-bold text-gray-300 tracking-widest">FILTERS</h3>

        {/* Search */}
        <div>
          <label className="text-caption text-gray-500 block mb-1">Search</label>
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Filter messages..."
            className="w-full px-2 py-1.5 text-caption font-mono rounded-node bg-[#1A1C24] border border-gray-700/50 text-white placeholder-gray-600 focus:border-red-500 outline-none"
          />
        </div>

        {/* Level */}
        <div>
          <label className="text-caption text-gray-500 block mb-1.5">Level</label>
          <div className="space-y-1">
            {["error", "warn", "info", "debug"].map((level) => (
              <label key={level} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={levelFilter.has(level)}
                  onChange={() => toggleLevel(level)}
                  className="rounded accent-red-500"
                />
                <span className={`text-caption ${LEVEL_COLORS[level]}`}>
                  {level} ({allLogs.filter((l) => l.level === level).length})
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Source */}
        <div>
          <label className="text-caption text-gray-500 block mb-1.5">Source</label>
          <select
            value={sourceFilter || ""}
            onChange={(e) => setSourceFilter(e.target.value || null)}
            className="w-full px-2 py-1.5 text-caption rounded-node bg-[#1A1C24] border border-gray-700/50 text-white"
          >
            <option value="">All sources</option>
            {sources.map((s) => (
              <option key={s} value={s}>
                {s} ({allLogs.filter((l) => l.source === s).length})
              </option>
            ))}
          </select>
        </div>

        {/* Agent */}
        <div>
          <label className="text-caption text-gray-500 block mb-1.5">Agent</label>
          <select
            value={agentFilter || ""}
            onChange={(e) => setAgentFilter(e.target.value || null)}
            className="w-full px-2 py-1.5 text-caption rounded-node bg-[#1A1C24] border border-gray-700/50 text-white"
          >
            <option value="">All agents</option>
            {agents.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        {/* Clear filters */}
        <button
          onClick={() => {
            setLevelFilter(new Set(["error", "warn", "info", "debug"]));
            setSourceFilter(null);
            setAgentFilter(null);
            setSearchText("");
          }}
          className="w-full py-1.5 text-caption rounded-pill border border-gray-700 text-gray-500 hover:text-white hover:border-gray-500 transition-colors"
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
}

function formatTimestamp(ts: string): string {
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts.slice(0, 19);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return ts.slice(0, 19);
  }
}
