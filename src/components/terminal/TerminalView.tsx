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

// ── Terminal Sandbox: blocked commands and patterns ──
const BLOCKED_COMMANDS = new Set([
  // Shell escape / privilege escalation
  "ssh",
  "scp",
  "sftp",
  "sudo",
  "su",
  "doas",
  "pkexec",
  "passwd",
  // Network tools
  "nc",
  "netcat",
  "ncat",
  "socat",
  "telnet",
  "ftp",
  // Download / exfil
  "wget",
  "curl",
  "aria2c",
  // Destructive
  "rm",
  "shred",
  "dd",
  "mkfs",
  "fdisk",
  "parted",
  "wipefs",
  // Security / hacking tools
  "john",
  "hashcat",
  "hydra",
  "nmap",
  "nikto",
  "sqlmap",
  "metasploit",
  "msfconsole",
  "msfvenom",
  "aircrack-ng",
  "airmon-ng",
  "burpsuite",
  "gobuster",
  "dirb",
  "wfuzz",
  "ffuf",
  "masscan",
  "zmap",
  // Proxy / tunnel tools
  "cloudflared",
  "warp-cli",
  "dante",
  "proxychains",
  "proxychains4",
  "tor",
  "torsocks",
  "i2p",
  "ngrok",
  "localtunnel",
  "lt",
  // VM / container escape
  "qemu",
  "virtualbox",
  "vboxmanage",
  "vagrant",
  "lxc",
  "lxd",
  "virsh",
  "docker",
  "podman",
  "containerd",
  "ctr",
  "nerdctl",
  // DoS / DDoS tools
  "hping3",
  "slowloris",
  "loic",
  "goldeneye",
  "hulk",
  // Database direct access
  "psql",
  "mysql",
  "mongo",
  "mongosh",
  "redis-cli",
  "sqlite3",
  // Supabase CLI
  "supabase",
  "npx",
  // Recon
  "shodan",
  "censys",
  "theHarvester",
  "recon-ng",
  "maltego",
  // Package managers (prevent installing tools)
  "apt",
  "apt-get",
  "dpkg",
  "yum",
  "dnf",
  "pacman",
  "snap",
  "flatpak",
  "pip",
  "pip3",
  "npm",
  "yarn",
  "pnpm",
  "cargo",
  "go",
]);

const BLOCKED_PATTERNS = [
  /rm\s+(-[rf]+\s+)?\//, // rm -rf /
  />\s*\/dev\//, // write to devices
  /\/etc\/(passwd|shadow|sudoers)/, // sensitive system files
  /\.ssh\//, // SSH directory
  /\.gnupg\//, // GPG keys
  /supabase\.co/, // Supabase project URL
  /wmsodwmjjnxfvfwlzpyf/, // Supabase project ID
  /127\.0\.0\.1|0\.0\.0\.0|::1/, // localhost bypass attempts (except configured services)
  /192\.168\.|10\.\d+\.|172\.(1[6-9]|2\d|3[01])\./, // internal network
  /\|\s*(sh|bash|zsh|fish|csh)/, // pipe to shell
  /`.*`/, // backtick command substitution
  /\$\(.*\)/, // $() command substitution
  /;\s*(sh|bash|sudo|rm|wget|curl)/, // command chaining to dangerous commands
];

function isCommandBlocked(cmd: string): string | null {
  const lower = cmd.toLowerCase();
  const firstWord = lower.split(/\s+/)[0];

  // Check exact command match
  if (BLOCKED_COMMANDS.has(firstWord)) {
    return `\x1b[31mBlocked:\x1b[0m \x1b[1m${firstWord}\x1b[0m is not allowed in the sandbox.\n\x1b[90mMultiClawProtocol terminal is restricted to safe operations only.\x1b[0m\n`;
  }

  // Check pattern match
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(lower)) {
      return `\x1b[31mBlocked:\x1b[0m command matches a restricted pattern.\n\x1b[90mThis operation is not permitted in the sandbox.\x1b[0m\n`;
    }
  }

  return null; // Command is allowed
}

/** Execute a command — sandboxed with blocklist */
async function executeCommand(cmd: string): Promise<string> {
  const trimmed = cmd.trim();
  if (!trimmed) return "";

  // ── Sandbox: check blocklist before ANY execution ──
  const blocked = isCommandBlocked(trimmed);
  if (blocked) return blocked;

  // Tauri shell support: when running as desktop app, real PTY will be wired here.
  // All commands are scoped to ~/.multiclawprotocol/ workspace.

  // Command router — whitelisted commands only
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
      "\x1b[1mHelp topics:\x1b[0m",
      "  help tutorial       — Quick-start guide (4 steps)",
      "  help agents         — Agent teams overview",
      "  help models         — Model routing & pricing",
      "  help keys           — API key setup",
      "  help souls          — Editing agent personalities",
      "",
      "\x1b[90mOr click the Help tab in the top navigation.\x1b[0m",
      "",
    ].join("\n");
  }

  if (trimmed === "help tutorial") {
    return [
      "\x1b[1;31mMulti\x1b[0m\x1b[1;37mClaw\x1b[0m\x1b[1;31mProtocol\x1b[0m — Quick Start",
      "",
      "\x1b[1;32m Step 1:\x1b[0m Drag an agent from the bottom bar onto the canvas",
      "\x1b[1;32m Step 2:\x1b[0m Drag a second agent. Connect: green handle → blue handle",
      "\x1b[1;32m Step 3:\x1b[0m Click a node → Inspector opens. Edit model, soul, tools",
      "\x1b[1;32m Step 4:\x1b[0m Click \x1b[32m▶ Run\x1b[0m (green, bottom-left) to execute",
      "",
      "\x1b[90mAutonomy modes: Manual (approve each step) | Auto (run all) | Checkpoint (save state)\x1b[0m",
      "",
    ].join("\n");
  }

  if (trimmed === "help agents") {
    return [
      "\x1b[1m18 Base Agents in 3 Teams + Solo + Supervisors:\x1b[0m",
      "",
      "\x1b[34m  The Brain (blue)\x1b[0m   STRATEGIST, INTEL, LEGAL-EXPERT",
      "\x1b[32m  The Forge (green)\x1b[0m  CODEREVIEW, BUILDER, BORIS, GITHUB-SCOUT",
      "\x1b[33m  The Hustle (amber)\x1b[0m SALES&CLOSER, MARKETER, DTF-EXPERT",
      "\x1b[35m  Solo (purple)\x1b[0m      ORCHESTRATOR, PROXY, SENTINEL, DESIGNER, SPEC-LOADER",
      "\x1b[31m  Supervisors (red)\x1b[0m  BRAIN-SUPERVISOR, FORGE-SUPERVISOR, HUSTLE-SUPERVISOR",
      "",
    ].join("\n");
  }

  if (trimmed === "help models") {
    return [
      "\x1b[1mModel Routing Table:\x1b[0m",
      "",
      "  \x1b[32mFree\x1b[0m      Qwen 3.6+              \x1b[36m$0/$0\x1b[0m",
      "  \x1b[32mFree\x1b[0m      Gemma 4 26B (Ollama)    \x1b[36m$0/$0\x1b[0m",
      "  \x1b[33mBudget\x1b[0m    Qwen3 32B              \x1b[36m$0.08/$0.24\x1b[0m",
      "  \x1b[33mBudget\x1b[0m    Gemma 4 26B            \x1b[36m$0.13/$0.40\x1b[0m",
      "  \x1b[33mMid\x1b[0m       DeepSeek V3.2          \x1b[36m$0.28/$0.42\x1b[0m",
      "  \x1b[35mPremium\x1b[0m   GLM 5V Turbo           \x1b[36m$1.20/$4.00\x1b[0m",
      "  \x1b[31mElite\x1b[0m     Claude Sonnet 4.5      \x1b[36m$3/$15\x1b[0m",
      "",
      "\x1b[90mChange model: click agent → Config tab → Model dropdown\x1b[0m",
      "",
    ].join("\n");
  }

  if (trimmed === "help keys") {
    return [
      "\x1b[1mAPI Key Setup:\x1b[0m",
      "",
      "  Go to \x1b[1mSettings\x1b[0m tab → API Keys section",
      "",
      "  Supported providers:",
      "  • OpenRouter (3 key pools, round-robin)",
      "  • Anthropic (Claude models)",
      "  • OpenAI, Google AI, Grok (xAI), Mistral",
      "  • Ollama Host (default: localhost:11434)",
      "  • LiteLLM Proxy (default: localhost:4000)",
      "",
      "\x1b[90mKeys stored locally — never sent to external servers.\x1b[0m",
      "",
    ].join("\n");
  }

  if (trimmed === "help souls") {
    return [
      "\x1b[1mEditing Agent Souls:\x1b[0m",
      "",
      "  A SOUL.md defines the agent's personality (system prompt).",
      "",
      "  To edit: click agent on canvas → \x1b[1mSoul\x1b[0m tab in Inspector",
      "  • \x1b[1mRole\x1b[0m — the agent's job title and identity",
      "  • \x1b[1mGoal\x1b[0m — what the agent is trying to achieve",
      "  • \x1b[1mConstraints\x1b[0m — hard rules, one per line",
      "",
      "  Changes save automatically when you click away.",
      "",
    ].join("\n");
  }

  if (trimmed === "agents") {
    try {
      const stored = localStorage.getItem("mcp-agent-registry");
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
