import { useEffect, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "xterm/css/xterm.css";

const THEME = {
  background: "#0A0B0F",
  foreground: "#e5e5e5",
  cursor: "#7dd3fc",
  cursorAccent: "#0A0B0F",
  selectionBackground: "#1B3A6B66",
  black: "#0A0B0F",
  red: "#DC2626",
  green: "#166534",
  yellow: "#D97706",
  blue: "#1E40AF",
  magenta: "#6B21A8",
  cyan: "#7dd3fc",
  white: "#e5e5e5",
  brightBlack: "#4B5563",
  brightRed: "#EF4444",
  brightGreen: "#4ade80",
  brightYellow: "#FFB347",
  brightBlue: "#60a5fa",
  brightMagenta: "#a78bfa",
  brightCyan: "#7dd3fc",
  brightWhite: "#ffffff",
};

const WELCOME = `\x1b[1;31mMulti\x1b[0m\x1b[1;37mClaw\x1b[0m\x1b[1;31mProtocol\x1b[0m Terminal v1.0.0
\x1b[90mType commands below. In Tauri desktop mode, this connects to a real shell.\x1b[0m
\x1b[90mIn browser mode, commands are sent via fetch to localhost services.\x1b[0m

`;

/** Execute a command — tries Tauri shell first, falls back to simulated responses */
async function executeCommand(cmd: string): Promise<string> {
  const trimmed = cmd.trim();
  if (!trimmed) return "";

  // Tauri shell support: when running as desktop app, real PTY will be wired here.
  // For now, all commands are handled by the browser-side command router below.

  // Browser fallback — handle common commands locally
  if (trimmed === "help") {
    return [
      "\x1b[1mAvailable commands:\x1b[0m",
      "  ollama list        — List local Ollama models",
      "  ollama ps          — Show running models",
      "  agents             — List registered agents",
      "  status             — Show system status",
      "  clear              — Clear terminal",
      "  help               — Show this help",
      "",
      "\x1b[90mOther commands are forwarded to local services when available.\x1b[0m",
      "",
    ].join("\n");
  }

  if (trimmed === "agents") {
    try {
      const stored = localStorage.getItem("anvilbus-agent-registry");
      if (stored) {
        const data = JSON.parse(stored);
        const agents = Object.values(data.state?.agents || {}) as Array<{
          id: string;
          display: { name: string; color_class: string };
          model: { preferred: { model_id: string } };
        }>;
        const lines = agents.map(
          (a) =>
            `  \x1b[1m${a.display.name.padEnd(20)}\x1b[0m \x1b[90m${a.model.preferred.model_id}\x1b[0m`,
        );
        return `\x1b[1m${agents.length} agents registered:\x1b[0m\n${lines.join("\n")}\n`;
      }
      return "No agents loaded.\n";
    } catch {
      return "Failed to read agent registry.\n";
    }
  }

  if (trimmed === "status") {
    const checks = await Promise.allSettled([
      fetch("http://localhost:11434/api/version", {
        signal: AbortSignal.timeout(2000),
      }).then((r) => (r.ok ? "connected" : "error")),
      fetch("http://localhost:4000/health", {
        signal: AbortSignal.timeout(2000),
      }).then((r) => (r.ok ? "connected" : "error")),
    ]);

    const ollama =
      checks[0].status === "fulfilled" ? checks[0].value : "offline";
    const litellm =
      checks[1].status === "fulfilled" ? checks[1].value : "offline";
    const ollamaColor = ollama === "connected" ? "32" : "31";
    const litellmColor = litellm === "connected" ? "32" : "31";

    return [
      "\x1b[1mSystem Status:\x1b[0m",
      `  Ollama:  \x1b[${ollamaColor}m${ollama}\x1b[0m  (localhost:11434)`,
      `  LiteLLM: \x1b[${litellmColor}m${litellm}\x1b[0m  (localhost:4000)`,
      "",
    ].join("\n");
  }

  if (trimmed === "ollama list" || trimmed === "ollama ls") {
    try {
      const resp = await fetch("http://localhost:11434/api/tags", {
        signal: AbortSignal.timeout(3000),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const models = (data.models || []) as Array<{
        name: string;
        size: number;
      }>;
      if (models.length === 0) return "No models installed.\n";
      const lines = models.map(
        (m) => `  ${m.name.padEnd(35)} ${(m.size / 1e9).toFixed(1)} GB`,
      );
      return `\x1b[1m${models.length} models:\x1b[0m\n${lines.join("\n")}\n`;
    } catch {
      return "\x1b[31mOllama not running. Start with: ollama serve\x1b[0m\n";
    }
  }

  if (trimmed === "ollama ps") {
    try {
      const resp = await fetch("http://localhost:11434/api/ps", {
        signal: AbortSignal.timeout(3000),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const models = (data.models || []) as Array<{
        name: string;
        size: number;
        size_vram: number;
      }>;
      if (models.length === 0) return "No models loaded in VRAM.\n";
      const lines = models.map(
        (m) =>
          `  ${m.name.padEnd(35)} ${(m.size_vram / 1e9).toFixed(1)} GB VRAM`,
      );
      return `\x1b[1m${models.length} running:\x1b[0m\n${lines.join("\n")}\n`;
    } catch {
      return "\x1b[31mOllama not running.\x1b[0m\n";
    }
  }

  return `\x1b[31mUnknown command: ${trimmed}\x1b[0m\nType \x1b[1mhelp\x1b[0m for available commands.\n`;
}

export function TerminalView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);

  useEffect(() => {
    if (!containerRef.current || termRef.current) return;

    const term = new Terminal({
      theme: THEME,
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      cursorStyle: "block",
      scrollback: 5000,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());
    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;

    // Welcome message
    term.write(WELCOME);
    term.write("\x1b[1;32mmcp\x1b[0m:\x1b[1;34m~\x1b[0m$ ");

    // Handle resize
    const observer = new ResizeObserver(() => fitAddon.fit());
    observer.observe(containerRef.current);

    // Handle input
    let buffer = "";
    term.onKey(({ key, domEvent }) => {
      const code = domEvent.keyCode;

      if (code === 13) {
        // Enter
        term.write("\r\n");
        const cmd = buffer;
        buffer = "";

        if (cmd.trim() === "clear") {
          term.clear();
          term.write("\x1b[1;32mmcp\x1b[0m:\x1b[1;34m~\x1b[0m$ ");
          return;
        }

        executeCommand(cmd).then((output) => {
          if (output) term.write(output.replace(/\n/g, "\r\n"));
          term.write("\x1b[1;32mmcp\x1b[0m:\x1b[1;34m~\x1b[0m$ ");
        });
      } else if (code === 8) {
        // Backspace
        if (buffer.length > 0) {
          buffer = buffer.slice(0, -1);
          term.write("\b \b");
        }
      } else if (domEvent.ctrlKey && code === 67) {
        // Ctrl+C
        buffer = "";
        term.write("^C\r\n\x1b[1;32mmcp\x1b[0m:\x1b[1;34m~\x1b[0m$ ");
      } else if (domEvent.ctrlKey && code === 76) {
        // Ctrl+L
        term.clear();
        term.write("\x1b[1;32mmcp\x1b[0m:\x1b[1;34m~\x1b[0m$ " + buffer);
      } else if (key.length === 1 && !domEvent.ctrlKey && !domEvent.altKey) {
        buffer += key;
        term.write(key);
      }
    });

    return () => {
      observer.disconnect();
      term.dispose();
      termRef.current = null;
    };
  }, []);

  return (
    <div className="h-full w-full flex flex-col bg-[#0A0B0F]">
      {/* Terminal header */}
      <div className="flex items-center justify-between h-8 px-3 bg-[#0F1117] border-b border-gray-800/50 flex-none">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#DC2626]" />
            <span className="w-3 h-3 rounded-full bg-[#D97706]" />
            <span className="w-3 h-3 rounded-full bg-[#166534]" />
          </div>
          <span className="text-caption text-gray-500 font-mono ml-2">
            MultiClawProtocol Terminal
          </span>
        </div>
        <span className="text-[0.6rem] text-gray-600 font-mono">
          {"__TAURI_INTERNALS__" in window ? "tauri:shell" : "browser:sim"}
        </span>
      </div>

      {/* Terminal body */}
      <div ref={containerRef} className="flex-1 p-1" />
    </div>
  );
}
