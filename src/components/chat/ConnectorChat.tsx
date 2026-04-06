import { useState, useRef, useEffect } from "react";

const CONNECTORS = [
  {
    id: "telegram",
    name: "Telegram",
    color: "#0088CC",
    tokenLabel: "Bot Token",
    placeholder: "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11",
    steps: [
      "1. Open Telegram and search for @BotFather",
      "2. Send /newbot and follow the prompts",
      "3. Copy the bot token",
      "4. Paste above and click Connect",
      "5. Send a message to your bot to start",
    ],
  },
  {
    id: "signal",
    name: "Signal",
    color: "#3A76F0",
    tokenLabel: "REST API URL",
    placeholder: "http://localhost:8080/api/v1",
    steps: [
      "1. Install signal-cli-rest-api (Docker)",
      "2. Register or link your Signal number",
      "3. Start the REST API server",
      "4. Paste the URL above and click Connect",
    ],
  },
  {
    id: "discord",
    name: "Discord",
    color: "#5865F2",
    tokenLabel: "Bot Token",
    placeholder: "MTI3NjM5...your-bot-token",
    steps: [
      "1. Go to discord.com/developers/applications",
      "2. Create app and add a Bot",
      "3. Copy the bot token",
      "4. Invite bot to your server",
      "5. Paste token above and click Connect",
    ],
  },
  {
    id: "slack",
    name: "Slack",
    color: "#4A154B",
    tokenLabel: "Bot OAuth Token",
    placeholder: "xoxb-your-bot-token",
    steps: [
      "1. Go to api.slack.com/apps",
      "2. Add scopes: chat:write, channels:history",
      "3. Install to workspace",
      "4. Copy Bot OAuth Token",
      "5. Paste above and click Connect",
    ],
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    color: "#25D366",
    tokenLabel: "Webhook URL",
    placeholder: "https://graph.facebook.com/v18.0/...",
    steps: [
      "1. Set up a Meta Business account",
      "2. Create WhatsApp Business app",
      "3. Configure webhook",
      "4. Paste URL above",
    ],
  },
  {
    id: "matrix",
    name: "Matrix",
    color: "#0DBD8B",
    tokenLabel: "Access Token",
    placeholder: "syt_your_access_token_here",
    steps: [
      "1. Create bot account on homeserver",
      "2. Get access token via login API",
      "3. Set homeserver URL in Settings",
      "4. Paste token above",
      "5. Invite bot to your room",
    ],
  },
];

interface ChatMessage {
  id: string;
  sender: "user" | "agent";
  text: string;
  timestamp: string;
}

export function ConnectorChat() {
  const [selectedId, setSelectedId] = useState("telegram");
  const [token, setToken] = useState("");
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const connector =
    CONNECTORS.find((c) => c.id === selectedId) ?? CONNECTORS[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleConnect = () => {
    if (!token.trim()) return;
    setConnected(true);
    setMessages([
      {
        id: "sys-1",
        sender: "agent",
        text: `Connected to ${connector.name}. You can now chat with your agents.`,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        sender: "user",
        text,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
    setInput("");
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `agent-${Date.now()}`,
          sender: "agent",
          text: `[${connector.name} bridge] Message queued: "${text}"`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    }, 500);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0F1117]">
      <div className="flex items-center justify-between h-8 px-3 bg-[#0F1117] border-b border-gray-800/50 flex-none">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: connector.color }}
          />
          <span className="text-caption text-gray-300 font-mono">
            Agent Chat
          </span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-status-success" : "bg-status-error"}`}
          />
        </div>
        <div className="flex items-center gap-2">
          {connected && (
            <button
              onClick={() => {
                setConnected(false);
                setMessages([]);
                setToken("");
              }}
              className="text-[0.6rem] text-red-400 hover:text-red-300"
            >
              Disconnect
            </button>
          )}
          <select
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value);
              setToken("");
              setConnected(false);
              setMessages([]);
            }}
            disabled={connected}
            className="text-[0.65rem] font-mono bg-white border border-[#898F9C] rounded px-2 py-0.5 text-black disabled:opacity-60"
          >
            {CONNECTORS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!connected && (
        <div className="flex-none px-4 py-3 border-b border-gray-800/30 space-y-1.5">
          <label className="text-[0.65rem] font-semibold text-gray-400 block">
            {connector.tokenLabel}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConnect()}
              placeholder={connector.placeholder}
              className="flex-1 px-2 py-1.5 text-[0.65rem] font-mono bg-white dark:bg-[#1A1C24] border border-[#898F9C] dark:border-gray-700/50 rounded text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:border-[#4267B2] outline-none"
            />
            <button
              onClick={handleConnect}
              disabled={!token.trim()}
              className="px-3 py-1.5 text-[0.65rem] font-semibold rounded bg-[#166534] text-white hover:bg-[#15803d] transition-colors disabled:opacity-40"
            >
              Connect
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {!connected ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span
                className="w-3 h-3 rounded-full"
                style={{ background: connector.color }}
              />
              <span className="text-body-sm font-bold text-white">
                Connect {connector.name}
              </span>
            </div>
            <div className="space-y-1.5">
              {connector.steps.map((step, i) => (
                <p
                  key={i}
                  className="text-[0.7rem] text-gray-400 leading-relaxed pl-1"
                >
                  {step}
                </p>
              ))}
            </div>
            <div className="border-t border-gray-800/30 pt-3 mt-4">
              <p className="text-[0.6rem] text-gray-600 uppercase tracking-widest font-bold mb-2">
                Other platforms
              </p>
              <div className="flex flex-wrap gap-1.5">
                {CONNECTORS.filter((c) => c.id !== selectedId).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedId(c.id);
                      setToken("");
                    }}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-pill border border-gray-700/50 hover:border-gray-500 transition-colors"
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: c.color }}
                    />
                    <span className="text-[0.6rem] text-gray-400">
                      {c.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-node text-[0.75rem] ${msg.sender === "user" ? "bg-[#1B3A6B] text-white" : "bg-[#1A1C24] text-gray-300 border border-gray-700/50"}`}
                >
                  <p>{msg.text}</p>
                  <span className="text-[0.55rem] text-gray-500 mt-1 block">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="flex-none p-2 border-t border-gray-800/50">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && connected && handleSend()}
            placeholder={
              connected
                ? `Message via ${connector.name}...`
                : "Connect a platform first..."
            }
            disabled={!connected}
            className="flex-1 px-3 py-2 text-caption font-mono bg-[#1A1C24] border border-gray-700/50 rounded-node text-white placeholder-gray-600 outline-none disabled:opacity-40"
          />
          <button
            onClick={handleSend}
            disabled={!connected || !input.trim()}
            className="px-3 py-2 text-caption font-semibold rounded-node text-white transition-colors disabled:opacity-40"
            style={{ background: connector.color }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
