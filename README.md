# MULTI**CLAW**PROTOCOL

Visual AI Agent Orchestration Platform — drag-and-drop pipeline builder for 18 AI agents.

Built with Tauri 2 + React 19 + TypeScript + Rust. Proprietary software by Karl Toussaint (kt2saint-sec).

## Quick Start

### 1. Install Dependencies

```bash
# Hermes Agent (required — the agent runtime)
pip install hermes-agent
hermes init

# Ollama (required — local LLM inference)
curl -fsSL https://ollama.com/install.sh | sh
ollama serve &
ollama pull huihui_ai/qwen3.5-abliterated:9b-q8_0

# ChromaDB (required — agent memory)
pip install chromadb sentence-transformers

# Docker (optional — sandboxed execution for BUILDER agent)
curl -fsSL https://get.docker.com | sh
```

### 2. Run from Source (Development)

```bash
git clone <repo-url>
cd multiclawprotocol
npm install
npm run dev          # Vite dev server on localhost:5173
```

### 3. Run Desktop App (Production)

```bash
# Install the .deb package
sudo dpkg -i MultiClawProtocol_0.1.0_amd64.deb

# Or run the AppImage directly
chmod +x MultiClawProtocol_0.1.0_amd64.AppImage
./MultiClawProtocol_0.1.0_amd64.AppImage
```

### 4. Configure API Keys (optional for cloud models)

Go to **Settings** tab → API Keys. Add keys for any providers you want to use:

| Provider | What it enables | Cost |
|----------|----------------|------|
| OpenRouter | Qwen, Gemma, DeepSeek, GLM models | $0-$4/M tokens |
| Anthropic | Claude Sonnet/Opus | $3-$15/M tokens |
| OpenAI | GPT-4o | Varies |
| Google AI | Gemini | Varies |
| Ollama (local) | Any local model | Free |

No API keys needed for local Ollama models.

## How to Use

### Building a Pipeline

1. **Drag** an agent card from the bottom bar onto the canvas
2. **Connect** agents: drag from the green output handle (right) to the blue input handle (left)
3. **Configure** each agent: click a node → Inspector panel opens on the right
4. **Run** the pipeline: click the green ▶ Run button (bottom-left)

### Editing an Agent's Soul

The "soul" is the agent's personality — it defines role, goal, and behavioral constraints.

1. Click an agent node on the canvas
2. Go to the **Soul** tab in the Inspector
3. Edit **Role** (job title), **Goal** (mission), **Constraints** (rules)
4. Changes save automatically when you click away

### Giving Instructions to Agents

When you click **▶ Run**, the execution engine:
1. Walks the pipeline graph in dependency order
2. Passes the pipeline context + previous agent outputs to each agent
3. Each agent receives its SOUL.md as the system prompt + the task as the user prompt
4. Outputs flow through typed edges to downstream agents

To customize what an agent does: edit its **Goal** in the Soul tab. Be specific.

### Autonomy Modes

Set before running (bottom-left, next to Run button):

| Mode | Behavior |
|------|----------|
| **Manual** | Pauses at every node for your approval |
| **Auto** | Runs to completion without stopping |
| **Checkpoint** | Saves state after each node (resume if interrupted) |

## The 18 Base Agents

| Team | Agents | Color |
|------|--------|-------|
| **The Brain** | STRATEGIST, INTEL, LEGAL-EXPERT | Blue |
| **The Forge** | CODEREVIEW, BUILDER, BORIS, GITHUB-SCOUT | Green |
| **The Hustle** | SALES&CLOSER, MARKETER, DTF-EXPERT | Amber |
| **Solo** | ORCHESTRATOR, PROXY, SENTINEL, DESIGNER, SPEC-LOADER | Purple |
| **Supervisors** | BRAIN-SUPERVISOR, FORGE-SUPERVISOR, HUSTLE-SUPERVISOR | Red |

All agents are pre-configured with default models, tools, and souls. Fully customizable.

## Pages

| Page | Description |
|------|-------------|
| **Pipeline** | Drag-and-drop canvas for building agent pipelines |
| **3D Map** | Interactive 3D visualization of the agent network |
| **Terminal** | Built-in command terminal (sandboxed) |
| **Logs** | Agent errors, token usage, killswitch events |
| **Settings** | API keys, local/cloud models, user profile |
| **Help** | Quick-start guide + topic-based help |

## Tech Stack

- **Desktop**: Tauri 2 (Rust backend + WebView frontend)
- **Frontend**: React 19, TypeScript, Tailwind CSS v4, React Flow v12, Zustand 5
- **Backend**: Rust (tokio async, rusqlite, reqwest)
- **Agent Runtime**: Hermes Agent (NousResearch, MIT)
- **Memory**: ChromaDB with Universal I/O envelope format
- **Models**: OpenRouter, Anthropic, OpenAI, Google, Ollama (local)
- **Auth**: Supabase (optional, local-only mode available)

## Build

```bash
npm run build         # Frontend only (Vite)
npm run typecheck     # TypeScript strict check
npm run lint          # ESLint
cargo tauri build     # Full desktop app (.deb, .rpm, .AppImage)
```

## License

Proprietary — Copyright (c) 2026 Karl Toussaint (kt2saint-sec). All Rights Reserved.

See [LICENSE](LICENSE) for full terms. Third-party dependencies listed in [THIRD-PARTY-LICENSES.md](THIRD-PARTY-LICENSES.md).

Built on [OpenClaw](https://github.com/openclaw/openclaw) (MIT) and [Hermes Agent](https://github.com/NousResearch/hermes-agent) (MIT).
