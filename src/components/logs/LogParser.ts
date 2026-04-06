export interface UnifiedLogEntry {
  id: string;
  timestamp: string;
  level: "error" | "warn" | "info" | "debug";
  source: "hermes" | "openrouter" | "ollama" | "killswitch" | "pipeline" | "docker";
  agent: string;
  message: string;
  cost?: number;
  raw?: string;
}

/** Parse ~/.hermes/logs/errors.log format */
export function parseErrorsLog(content: string): UnifiedLogEntry[] {
  const entries: UnifiedLogEntry[] = [];
  const lines = content.split("\n").filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Format: 2026-04-05 16:17:32,123 [ERROR] agent_name: message
    const match = line.match(
      /^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})[,.]?\d*\s+\[(\w+)\]\s*(\S+)?:?\s*(.*)/,
    );

    if (match) {
      const [, ts, level, agent, msg] = match;
      const lowerLevel = level.toLowerCase() as UnifiedLogEntry["level"];

      // Detect source from message content
      let source: UnifiedLogEntry["source"] = "hermes";
      if (msg.includes("429") || msg.includes("rate limit") || msg.includes("openrouter"))
        source = "openrouter";
      else if (msg.includes("ollama") || msg.includes("11434")) source = "ollama";
      else if (msg.includes("docker") || msg.includes("exit status 125"))
        source = "docker";

      entries.push({
        id: `err-${i}`,
        timestamp: ts,
        level: ["error", "warn", "info", "debug"].includes(lowerLevel)
          ? lowerLevel
          : "error",
        source,
        agent: agent || "unknown",
        message: msg.trim(),
        raw: line,
      });
    } else if (line.trim()) {
      // Continuation line — append to previous entry
      if (entries.length > 0) {
        entries[entries.length - 1].message += "\n" + line.trim();
      }
    }
  }

  return entries;
}

/** Parse ~/.hermes/logs/token_usage.jsonl */
export function parseTokenUsage(content: string): UnifiedLogEntry[] {
  const entries: UnifiedLogEntry[] = [];
  const lines = content.split("\n").filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    try {
      const entry = JSON.parse(lines[i]);
      const tokens = (entry.input_tokens || 0) + (entry.output_tokens || 0);
      const cost = entry.estimated_cost_usd || 0;
      const isZero = tokens === 0;

      entries.push({
        id: `tok-${i}`,
        timestamp: entry.timestamp || "",
        level: isZero ? "warn" : "info",
        source: entry.model?.includes("ollama") ? "ollama" : "openrouter",
        agent: entry.agent_id || entry.session_id || "unknown",
        message: isZero
          ? `Zero tokens logged for ${entry.model} (tracking may be broken)`
          : `${tokens} tokens, $${cost.toFixed(6)} — ${entry.model}`,
        cost,
      });
    } catch {
      // Skip malformed lines
    }
  }

  return entries;
}

/** Parse ~/openclaw/logs/killswitch.log */
export function parseKillswitchLog(content: string): UnifiedLogEntry[] {
  const entries: UnifiedLogEntry[] = [];
  const lines = content.split("\n").filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Format: 2026-04-06T02:29:00+00:00 CIRCUIT_BREAK loop_detected ...
    const match = line.match(/^(\S+)\s+(THROTTLE|CIRCUIT_BREAK|SHUTDOWN)\s+(.*)/);

    if (match) {
      const [, ts, level, msg] = match;
      entries.push({
        id: `ks-${i}`,
        timestamp: ts,
        level: level === "SHUTDOWN" ? "error" : level === "CIRCUIT_BREAK" ? "warn" : "info",
        source: "killswitch",
        agent: "sentinel",
        message: `[${level}] ${msg.trim()}`,
        raw: line,
      });
    }
  }

  return entries;
}

/** Merge and sort all log entries by timestamp (newest first) */
export function mergeAndSort(entries: UnifiedLogEntry[]): UnifiedLogEntry[] {
  return entries.sort((a, b) => {
    const ta = new Date(a.timestamp).getTime() || 0;
    const tb = new Date(b.timestamp).getTime() || 0;
    return tb - ta; // newest first
  });
}

/** Fetch a log file via HTTP (works when files are served, or in dev) */
export async function fetchLogFile(path: string): Promise<string> {
  // In Tauri, use the fs plugin
  if ("__TAURI_INTERNALS__" in window) {
    try {
      const { readTextFile } = await import("@tauri-apps/plugin-fs");
      return await readTextFile(path);
    } catch {
      // Fall through to fetch
    }
  }

  // In browser, try to read from a local API or return empty
  return "";
}
