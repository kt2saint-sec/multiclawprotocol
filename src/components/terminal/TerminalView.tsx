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

export function TerminalView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const sessionRef = useRef<number | null>(null);

  useEffect(() => {
    if (!containerRef.current || termRef.current) return;

    const term = new Terminal({
      theme: THEME,
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      cursorStyle: "block",
      scrollback: 10000,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());
    term.open(containerRef.current);
    termRef.current = term;

    let unlisten: (() => void) | null = null;
    let unlistenExit: (() => void) | null = null;

    const initTimer = setTimeout(async () => {
      fitAddon.fit();

      if (!("__TAURI_INTERNALS__" in window)) {
        term.write(
          "\x1b[1;31mBrowser mode\x1b[0m — real shell requires the desktop app.\r\n",
        );
        return;
      }

      const { invoke } = await import("@tauri-apps/api/core");
      const { listen } = await import("@tauri-apps/api/event");

      try {
        const sessionId = (await invoke("spawn_pty", {
          cols: term.cols,
          rows: term.rows,
        })) as number;
        sessionRef.current = sessionId;

        unlisten = await listen<string>(`pty-output-${sessionId}`, (event) => {
          term.write(event.payload);
        });
        unlistenExit = await listen(`pty-exit-${sessionId}`, () => {
          term.write("\r\n\x1b[90m[Shell exited]\x1b[0m\r\n");
          sessionRef.current = null;
        });

        term.onData((data) => {
          if (sessionRef.current !== null)
            invoke("pty_write", { sessionId, data }).catch(() => {});
        });
        term.onResize(({ cols: c, rows: r }) => {
          if (sessionRef.current !== null)
            invoke("pty_resize", { sessionId, cols: c, rows: r }).catch(
              () => {},
            );
        });
      } catch (err) {
        term.write(`\x1b[31mFailed to start shell: ${err}\x1b[0m\r\n`);
      }
    }, 150);

    let fitTimer: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver(() => {
      clearTimeout(fitTimer);
      fitTimer = setTimeout(() => fitAddon.fit(), 50);
    });
    observer.observe(containerRef.current);

    return () => {
      clearTimeout(initTimer);
      observer.disconnect();
      if (unlisten) unlisten();
      if (unlistenExit) unlistenExit();
      if (sessionRef.current !== null && "__TAURI_INTERNALS__" in window) {
        import("@tauri-apps/api/core").then(({ invoke }) => {
          invoke("pty_kill", { sessionId: sessionRef.current }).catch(() => {});
        });
      }
      term.dispose();
      termRef.current = null;
      sessionRef.current = null;
    };
  }, []);

  return (
    <div className="h-full w-full flex flex-col bg-[#0A0B0F]">
      <div className="flex items-center justify-between h-8 px-3 bg-[#0F1117] border-b border-gray-800/50 flex-none">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#DC2626]" />
            <span className="w-3 h-3 rounded-full bg-[#D97706]" />
            <span className="w-3 h-3 rounded-full bg-[#166534]" />
          </div>
          <span className="text-caption text-gray-500 font-mono ml-2">
            bash
          </span>
        </div>
        <span className="text-[0.6rem] text-gray-600 font-mono">
          {"__TAURI_INTERNALS__" in window ? "pty" : "browser"}
        </span>
      </div>
      <div ref={containerRef} className="flex-1 min-h-0 overflow-hidden p-1" />
    </div>
  );
}
