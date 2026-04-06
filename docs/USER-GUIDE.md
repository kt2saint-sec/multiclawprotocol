# <span style="color:white">MULTI</span><span style="color:red">CLAW</span><span style="color:white">PROTOCOL</span> — User Guide

> **MULTI**<span style="color:red">**CLAW**</span>**PROTOCOL** — Visual AI Agent Pipeline Builder  
> Version 0.4.0 | Built on Hermes Agent v0.7.0 + MultiClawProtocol Platform  
> 2026-04-06

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [The Pipeline Page](#2-the-pipeline-page)
3. [Agent Configuration (Inspector Panel)](#3-agent-configuration-inspector-panel)
4. [The 18 Base Agents](#4-the-18-base-agents)
5. [Editing Agent Souls](#5-editing-agent-souls)
6. [Adding Custom Agents](#6-adding-custom-agents)
7. [Settings Page](#7-settings-page)
8. [3D Map](#8-3d-map)
9. [Terminal](#9-terminal)
10. [Log Viewer](#10-log-viewer)
11. [Model Routing](#11-model-routing)
12. [Keyboard Shortcuts](#12-keyboard-shortcuts)
- [Appendix A: Pipeline File Format](#appendix-a-pipeline-file-format)
- [Appendix B: SOUL.md File Format](#appendix-b-soulmd-file-format)
- [Appendix C: Kill-Switch Protocol](#appendix-c-kill-switch-protocol)
- [Appendix D: File Locations](#appendix-d-file-locations)

---

## 1. Getting Started

### What MultiClawProtocol Is

MultiClawProtocol is a local-first desktop application for building and running AI agent pipelines visually. You drag agents from a palette onto a canvas, connect their outputs to other agents' inputs, configure each agent's model and personality, and run the pipeline with one click.

Key concepts:

- **Agent** — an AI worker with a model, a soul (role/goal/constraints), and a set of tools.
- **Pipeline** — a directed graph of agents connected by typed edges. Data flows left to right.
- **Soul** — the agent's personality file (`SOUL.md`). Defines role, goal, and behavioral constraints. Injected as the system prompt at runtime.
- **Execution** — the engine walks the pipeline graph, fires each agent in dependency order, and routes outputs to downstream agents.

Built with: Tauri 2 + React 19 + TypeScript + Tailwind CSS + React Flow + Zustand + LiteLLM.

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| OS | Ubuntu 24.04+ (Linux) | Ubuntu 24.04 LTS |
| CPU | 4 cores | AMD Ryzen 9 / Intel i9 (16+ cores) |
| RAM | 16 GB | 64 GB+ |
| GPU | Optional | AMD RX 7900 XTX 24GB / NVIDIA RTX 4090 |
| Storage | 20 GB free | NVMe SSD |
| Docker | 24.0+ | Required for Docker isolation mode |
| Ollama | 0.20.0+ | Required for local models |

> GPU is strongly recommended for local models via Ollama. Cloud-only pipelines work without one.

### First Launch: Dependency Checker

On first launch, MultiClawProtocol runs a dependency check. Each item shows a green check or a red warning:

| Dependency | What It Checks |
|------------|----------------|
| **Ollama** | `ollama serve` running on `localhost:11434` |
| **Docker** | Docker daemon is reachable |
| **ChromaDB** | ChromaDB REST API on `localhost:8000` |

Click **Continue Anyway** to skip non-critical failures. Affected features will be disabled or degraded.

### Sign Up / Sign In

MultiClawProtocol supports two auth modes:

1. **Local-only** — no account required. All config stored in `~/.multiclawprotocol/`. Click **Continue Locally**.
2. **Cloud sync** — sign up with email or GitHub OAuth. Pipelines and agent configs sync to your account.

For most users, local-only is the right choice. Your API keys never leave the machine.

---

## 2. The Pipeline Page

The Pipeline page is the main workspace. It has four regions:

| Region | Description |
|--------|-------------|
| Canvas (center) | Infinite drag-and-drop plane for building pipelines |
| Agent Palette (bottom bar) | Scrollable row of all available agent chips |
| Inspector Panel (right) | Config, soul, schema, and logs for the selected agent |
| Execution Controls (bottom-left) | Run, Pause, Stop buttons and autonomy mode selector |

### Canvas

The canvas is a React Flow infinite plane.

- **Pan** — hold middle-click or Space+drag.
- **Zoom** — scroll wheel.
- **Add an agent** — drag any chip from the bottom palette and drop on the canvas.
- **Move an agent** — click and drag the node header.
- **Remove an agent** — click the **X** button on the top-right corner of the node.
- **Select an agent** — single-click a node. The Inspector panel opens on the right.
- **Deselect** — click empty canvas space.
- **Fit view** — press **Space**.

### Connecting Agents

Agents communicate via typed directed edges:

1. Hover over a node to reveal the **green output handle** on its right side.
2. Click and drag from the green handle.
3. Drop onto the **blue input handle** on the left side of the target agent.

A directional arrow edge appears. Data flows source → target at runtime.

**Rules:**
- Fan-out allowed — one output connects to multiple targets.
- Fan-in allowed — one input receives from multiple sources.
- Cycles are blocked — the canvas rejects connections that create loops.

To **remove a connection**: click the edge to select it, then press **Delete**.

### Execution Controls

Located bottom-left of the canvas.

| Button | Color | Action |
|--------|-------|--------|
| Run | Green | Start pipeline execution from the beginning |
| Pause | Orange | Suspend after the current node finishes |
| Stop | Red | Halt execution immediately |

A progress indicator shows the active node and queue depth during execution.

### Autonomy Modes

Set before pressing Run.

| Mode | Behavior |
|------|----------|
| **Manual** | Pauses before every node. You review proposed inputs and approve before the agent runs. Best for sensitive pipelines. |
| **Auto** | Runs to completion without stopping. Best for trusted, tested pipelines. |
| **Checkpoint** | Saves state to disk after each node completes. Resume from last checkpoint if interrupted. Best for long-running pipelines. |

---

## 3. Agent Configuration (Inspector Panel)

Click any agent node to open the Inspector panel on the right. Four tabs: **Config**, **Soul**, **Schema**, **Logs**.

Click the **arrow** on the left edge of the Inspector to collapse or expand it.

### Config Tab

| Setting | Description |
|---------|-------------|
| **Name** | Display name for this node (editable, does not change the agent type) |
| **Model** | Select from 8+ available models — see Section 11 |
| **Temperature** | 0.0 (deterministic) to 2.0 (creative). Default: 0.7 |
| **Max Tokens** | Maximum tokens generated per turn. Default: 4096 |
| **Isolation Mode** | How the agent process is sandboxed — see below |

**Isolation Modes:**

| Mode | Description | Use When |
|------|-------------|----------|
| `in_process` | Runs in the main process. No overhead. | Trusted agents, prototyping |
| `subprocess` | Sandboxed child process. Crashes don't affect the pipeline. | Production pipelines |
| `docker` | Runs inside a Docker container. Full filesystem isolation. | BUILDER agent, untrusted code |

### Soul Tab

Live editor for the agent's `SOUL.md` — the document defining personality and behavioral rules.

| Field | Description |
|-------|-------------|
| **Role** | The agent's job title and identity. One or two sentences. |
| **Goal** | What the agent is trying to achieve. The north star. |
| **Constraints** | Hard rules the agent must follow. One rule per line. |

Changes save automatically on blur (when you click away from a field). The soul file on disk updates immediately.

### Schema Tab

Shows the agent's I/O payload types:

- **Input schema** — JSON schema for what this agent expects to receive.
- **Output schema** — JSON schema for what this agent produces.
- **Payload type** — the envelope type (`research_output`, `code_artifact`, `evaluation`, etc.)

Verify connected agents have compatible schemas before running a pipeline.

### Logs Tab

Real-time execution logs for the selected agent, filtered from the global stream.

| Column | Description |
|--------|-------------|
| Timestamp | When the event occurred |
| Level | `DEBUG`, `INFO`, `WARN`, `ERROR` |
| Message | Log content |

Use the level dropdown at the top of the tab to reduce noise.

---

## 4. The 18 Base Agents

MultiClawProtocol ships with 18 pre-built agents in three teams plus solo agents and supervisors.

### The Brain Team (Blue) — Strategy and Research

| Agent | Role | Default Model |
|-------|------|---------------|
| **STRATEGIST** | Lead. Budget analysis, assistant coordination, strategic gap identification | Qwen 3.6+ (free) |
| **INTEL** | Market briefings, competitor research, trend scanning with live web search | GLM 5V Turbo |
| **LEGAL-EXPERT** | Licensing analysis, compliance, healthcare law (HIPAA) | Qwen 3.6+ (free) |

### The Forge Team (Green) — Code and QA

| Agent | Role | Default Model |
|-------|------|---------------|
| **CODEREVIEW** | Lead. 2-pass code review: Pass 1 — what's good; Pass 2 — what's incomplete | Claude Sonnet 4.5 |
| **BUILDER** | Writes code, creates files, executes commands. The only write-capable agent | Gemma 4 26B |
| **BORIS** | Adversarial PROVE-IT gate. 5-pillar critique, maximum 2 review cycles | Qwen3 32B |
| **GITHUB-SCOUT** | Weekly tool and repository discovery, ecosystem monitoring | GLM 5V Turbo |

### The Hustle Team (Amber) — Sales and Marketing

| Agent | Role | Default Model |
|-------|------|---------------|
| **SALES&CLOSER** | Lead. Lead gen, outreach sequences, pipeline management, closing | Qwen 3.6+ (free) |
| **MARKETER** | Content creation, social media strategy, SEO, competitor analysis | GLM 5V Turbo |
| **DTF-EXPERT** | Direct-to-film and direct-to-garment domain specialist | Qwen 3.6+ (free) |

### Solo Agents (Purple)

| Agent | Role | Default Model |
|-------|------|---------------|
| **ORCHESTRATOR** | Central router. Receives all tasks, selects the right agent, delegates | Gemma 4 26B |
| **PROXY** | Impartial judge. Evaluates evidence, approves/rejects/revises supervisor sendbacks | DeepSeek V3.2 |
| **SENTINEL** | System security, infrastructure health, owns the 3-level kill-switch | Qwen 3.6+ (free) |
| **DESIGNER** | Web development and graphic design (bridges Forge and Hustle teams) | GLM 5V Turbo |
| **SPEC-LOADER** | Decomposes PRDs into atomic tasks, feeds sequentially to BUILDER/DESIGNER | DeepSeek V3.2 |

### Supervisors (Red)

Supervisors trail the output quality of their assigned team in real time. They can send work back for revision, which routes through PROXY for impartial judgment before re-queuing.

| Agent | Team Monitored | Default Model |
|-------|---------------|---------------|
| **BRAIN-SUPERVISOR** | The Brain | GLM 5V Turbo |
| **FORGE-SUPERVISOR** | The Forge | GLM 5V Turbo |
| **HUSTLE-SUPERVISOR** | The Hustle | GLM 5V Turbo |

---

## 5. Editing Agent Souls

### What a SOUL.md Is

Every agent has a `SOUL.md` file at `~/.multiclawprotocol/agents/<agent-id>/SOUL.md`. It is plain markdown with three sections: Role, Goal, and Constraints. The execution engine injects the soul as the system prompt when the agent is invoked.

The soul is what makes an agent useful. The same underlying model behaves completely differently depending on the soul. You can give any agent any soul.

### How to Edit

1. Click the agent node on the canvas.
2. Click the **Soul** tab in the Inspector panel.
3. Edit the Role, Goal, or Constraints fields.
4. Click away — changes save automatically.

The soul file updates on disk immediately. If the pipeline is already running, the new soul takes effect on the next invocation of that agent.

### Field Reference

**Role**

The agent's identity. The first thing the model reads. Be specific.

Good:
> Senior Cybersecurity Engineer. Specializes in infrastructure hardening, firewall policy, and red-team threat modeling.

Bad:
> Security agent.

**Goal**

What the agent is trying to achieve. Write it as the agent's internal north star.

Good:
> Identify every exploitable vulnerability in the provided codebase and produce a prioritized remediation report with PoC exploit code for each finding.

**Constraints**

Hard behavioral rules. One rule per line. Enforced as negative space around the goal.

Examples:
```
- Never suggest deleting production data without an explicit backup confirmation
- Always include CVSS scores in security findings
- Express uncertainty when evidence is inconclusive — never fabricate
- Do not access banking sites, payment processors, or financial accounts
```

---

## 6. Adding Custom Agents

Customize any base agent into a specialist for your pipeline. Changes persist inside the pipeline file and do not modify the base agent templates.

1. Drag any base agent from the palette onto the canvas.
2. Click the node to open the Inspector.
3. **Config tab** — change Name (e.g., `HIPAA-AUDITOR`).
4. **Config tab** — select model and isolation mode.
5. **Soul tab** — rewrite Role, Goal, and Constraints for the new purpose.

The customized agent is saved inside `~/.multiclawprotocol/pipelines/<pipeline-id>.yaml` as a node-level soul override.

**Tip:** Start from the agent whose team color matches your intent. BUILDER-derived agents for code tasks. INTEL-derived agents for research tasks. This keeps the visual layout semantically meaningful.

---

## 7. Settings Page

Access via the gear icon in the sidebar. All settings stored locally in `~/.multiclawprotocol/config.yaml`. Nothing sent to external servers.

### API Keys

| Provider | Field | Notes |
|----------|-------|-------|
| OpenRouter | Pool 1, Pool 2, Pool 3 | Three key pools, round-robin load distribution. Set per-key spending caps. |
| Anthropic | API Key | For Claude Sonnet 4.5 / 4.6. Leave blank to use Meridian proxy. |
| OpenAI | API Key | For GPT-4o and o1 models. |
| Google AI | API Key | For Gemini models. |
| Grok (xAI) | API Key | For Grok-3 models. |
| Mistral | API Key | For Mistral Large and Codestral. |
| Ollama Host | URL | Default: `http://localhost:11434`. Change for remote Ollama. |
| LiteLLM Proxy | URL | For self-hosted LiteLLM instances. |

Keys are stored encrypted in `~/.multiclawprotocol/config.yaml` and are never included in pipeline exports.

### Models

**Local Models** — auto-scans Ollama and lists all installed models with size and quantization. A green dot means the model is currently loaded in VRAM.

**Cloud Models** — lists 10 available cloud models with provider, model ID, input/output pricing, and key status (green = configured, red = missing).

### Profile

- Edit display name
- View auth provider (local or GitHub/email)
- Export settings to a portable config file
- Reset to defaults

---

## 8. 3D Map

An interactive force-directed 3D graph showing all 18 agents and their relationships.

### Navigation

| Action | Control |
|--------|---------|
| Rotate | Click and drag |
| Zoom | Scroll wheel |
| Pan | Right-click and drag |
| Reset view | Double-click empty space |

### Reading the Map

- **Node color** — matches team color: blue (Brain), green (Forge), amber (Hustle), purple (Solo), red (Supervisors).
- **Node size** — reflects activity level. Larger = more tokens processed this session.
- **Edge lines** — show defined relationships: delegate, review, monitor, cost-track, observe.
- **Hover** — shows a tooltip with agent name, model, and current status.

The 3D Map is read-only. Use it for situational awareness: active agents, bottleneck detection, network topology.

---

## 9. Terminal

Built-in terminal with MultiClawProtocol-specific commands.

In **web mode** (browser): sandboxed command interpreter with MCP commands only.  
In **Tauri desktop mode**: connects to a real bash/zsh shell on the host machine.

### Available Commands

| Command | Description |
|---------|-------------|
| `help` | List all available commands |
| `agents` | All 18 agents with current status and model assignment |
| `status` | Pipeline execution status: active node, queue depth, session cost |
| `ollama list` | All Ollama models installed locally |
| `ollama ps` | Models currently loaded in VRAM |
| `clear` | Clear terminal output |

### Examples

```
> agents
ORCHESTRATOR    [idle]   google/gemma-4-26b-a4b-it   Gemma 4 26B
STRATEGIST      [idle]   qwen/qwen3.6-plus:free       Qwen 3.6+ Free
BUILDER         [active] google/gemma-4-26b-a4b-it   Gemma 4 26B
INTEL           [queued] z-ai/glm-5v-turbo            GLM 5V Turbo
...

> status
Pipeline:  storefront-research-v2
Status:    RUNNING
Active:    INTEL (node 3/7)
Queue:     MARKETER, SALES&CLOSER
Cost:      $0.0023 this session

> ollama ps
NAME                       ID       SIZE    PROCESSOR  UNTIL
gemma4:26b-a4b-q4_K_M     abc123   14 GB   100% GPU   4 minutes from now
```

---

## 10. Log Viewer

Unified log stream for all events across the entire pipeline.

### Layout

- **Stats bar** (top) — total error count, warning count, cumulative cost for the session.
- **Filter bar** — filter by log level, source agent, free-text search.
- **Log stream** — timestamped entries, color-coded by level.

### Log Levels

| Level | Color | Meaning |
|-------|-------|---------|
| `ERROR` | Red | Agent failure, API error, or pipeline halt |
| `WARN` | Amber | Retry attempt, degraded mode, near-limit warning |
| `INFO` | White | Normal execution: agent started, completed, output produced |
| `DEBUG` | Gray | Verbose internals: token counts, tool calls, memory reads |

### Special Event Types

| Event Type | Description |
|------------|-------------|
| `killswitch` | SENTINEL triggered a kill-switch level. Shows level (1/2/3) and reason. |
| `token_usage` | Per-turn breakdown: prompt tokens, completion tokens, cost. |
| `pipeline_exec` | Pipeline-level events: start, checkpoint saved, pause, stop. |
| `agent_error` | Agent failure with stack trace if available. |

### Filtering

- **Level filter** — dropdown. Show only ERROR + WARN to focus on problems.
- **Agent filter** — dropdown of agents in the current pipeline.
- **Search** — free-text across all fields. Partial matches supported.

Logs clear when you start a new pipeline session. Use the **Export** button (top-right) to save logs to a file.

---

## 11. Model Routing

Each agent uses its own model. MultiClawProtocol's router (LiteLLM) handles provider normalization, key rotation, and fallback chains automatically.

### Available Models

| Tier | Model | Provider | Input | Output | Best For |
|------|-------|----------|-------|--------|----------|
| Free | Qwen 3.6 Plus | OpenRouter | $0 | $0 | Low-volume agents (rate-limited) |
| Free | Gemma 4 26B | Ollama (local) | $0 | $0 | All-purpose local execution |
| Budget | Qwen3 32B | OpenRouter | $0.08/M | $0.24/M | Adversarial reasoning, BORIS |
| Budget | Gemma 4 26B | OpenRouter | $0.13/M | $0.40/M | Agentic tool use, BUILDER |
| Mid | DeepSeek V3.2 | OpenRouter | $0.28/M | $0.42/M | Evaluation, impartial judgment |
| Premium | GLM 5V Turbo | OpenRouter | $1.20/M | $4.00/M | Web search + vision agents |
| Elite | Claude Sonnet 4.5 | Anthropic | $3/M | $15/M | Code review |
| Elite | Claude Sonnet 4.6 | Anthropic | $3/M | $15/M | Universal fallback |

### Assignment Guidelines

- **Tool-heavy agents** (ORCHESTRATOR, BUILDER) — highest τ2-bench score per dollar. Currently Gemma 4 26B.
- **Reasoning/adversarial agents** (BORIS, CODEREVIEW) — highest BFCL v3 score. Currently Qwen3 32B / Claude Sonnet.
- **Research/vision agents** (INTEL, GITHUB-SCOUT, MARKETER) — requires web search capability. Currently GLM 5V Turbo.
- **High-volume background agents** (STRATEGIST, SENTINEL) — free tier where quality is sufficient.

### Credential Pool Strategy

MultiClawProtocol distributes API calls across your three OpenRouter key pools using `round_robin`. This keeps each key under its spending cap during heavy pipeline runs.

Enable **fallback to Claude via Meridian** in Settings > API Keys to route automatically to Claude Sonnet 4.6 when OpenRouter keys are exhausted.

> Warning: Never assign `:free` suffix models to agents in active multi-agent pipelines. Free-tier models have aggressive rate limits that will stall pipeline execution mid-run.

---

## 12. Keyboard Shortcuts

| Shortcut | Action | Status |
|----------|--------|--------|
| `Space` | Fit all nodes in viewport | Available |
| `Delete` | Remove selected node from canvas | Available |
| `Ctrl+S` | Save pipeline | Available |
| `Ctrl+R` | Run pipeline | Available |
| `Escape` | Deselect node / close Inspector | Available |
| `Ctrl+Z` | Undo last canvas action | Planned |
| `Ctrl+Shift+Z` | Redo | Planned |
| `Ctrl+A` | Select all nodes | Planned |
| `Ctrl+D` | Duplicate selected node | Planned |

---

## Appendix A: Pipeline File Format

Pipelines save as YAML at `~/.multiclawprotocol/pipelines/<pipeline-id>.yaml`. Human-readable and git-friendly.

```yaml
pipeline:
  id: storefront-research-v2
  name: Storefront Research Pipeline
  version: "1.0.0"
  created_at: 2026-04-06T00:00:00Z

nodes:
  - id: node-1
    agent_id: orchestrator
    position: { x: 100, y: 200 }
    config:
      model: google/gemma-4-26b-a4b-it
      temperature: 0.7
      max_tokens: 4096
      isolation: subprocess
    soul_override: null   # null = use default soul from ~/.multiclawprotocol/agents/

  - id: node-2
    agent_id: intel
    position: { x: 400, y: 100 }
    config:
      model: z-ai/glm-5v-turbo
      temperature: 0.6
      max_tokens: 8192
      isolation: subprocess
    soul_override: null

edges:
  - id: edge-1
    source: node-1
    target: node-2
    type: delegate

autonomy_mode: checkpoint
```

---

## Appendix B: SOUL.md File Format

```markdown
# AGENT-NAME — OpenClaw Agent Network

## Identity
You are AGENT-NAME, [brief description].
Team: [Team Name] | Model: [Model Name] | Authority: [permissions]

## Mission
[One paragraph describing the agent's purpose and approach.]

## Constraints
- [Rule one]
- [Rule two]
- [Rule three]
```

---

## Appendix C: Kill-Switch Protocol

SENTINEL enforces a three-level kill-switch. These events appear in the Log Viewer as `killswitch` type entries.

| Level | Trigger | Action |
|-------|---------|--------|
| **Level 1** | Policy violation detected (financial action attempted, unauthorized write) | Offending agent halted. SENTINEL alert sent. Pipeline continues without that agent. |
| **Level 2** | Repeated violations or security anomaly | Entire pipeline paused. Human approval required to resume. |
| **Level 3** | Critical security event | All agent processes terminated. Pipeline state saved to disk. Manual restart required. |

SENTINEL is the only agent that can trigger Level 2 and Level 3. No other agent can override a kill-switch event.

---

## Appendix D: File Locations

| Path | Contents |
|------|----------|
| `~/.multiclawprotocol/` | Root config directory |
| `~/.multiclawprotocol/config.yaml` | API keys, model settings, user preferences |
| `~/.multiclawprotocol/agents/` | Base agent manifests and SOUL.md files |
| `~/.multiclawprotocol/pipelines/` | Saved pipeline YAML files |
| `~/.multiclawprotocol/logs/` | Session logs (rotated daily) |
| `~/.multiclawprotocol/checkpoints/` | Checkpoint state files for pipeline resume |
| `/mnt/nvme-fast/hermes-workspace/projects/` | Agent execution workspace (BUILDER writes here) |

---

*MULTICLAW**PROTOCOL** v0.4.0 — 2026-04-06*  
*Built on Hermes Agent v0.7.0 + MultiClawProtocol Platform*
