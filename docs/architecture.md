# AnvilBus: Complete Architecture for Visual Agent Orchestration

**AnvilBus is a local-first visual agent orchestration platform that chains 14 AI agents through drag-and-drop pipelines, backed by a persistent Hermes brain with RAG memory and a LiteLLM-powered model router spanning local Ollama and cloud providers — all within a Tauri desktop app costing under $12/month.** This specification delivers eight complete, implementable design documents: agent manifest schema, pipeline definition format, a demo storefront pipeline, React Flow canvas UI, Tauri project scaffold, Tailwind design system, model router config, and execution engine architecture. Every spec is YAML-serializable, git-friendly, and framework-agnostic — designed so a solo developer on a Ryzen 9 9950X with 24GB VRAM can run the entire stack locally.

---

## 1. Agent manifest spec defines every pluggable agent

The `agent.yaml` manifest draws from CrewAI's YAML-first role/goal/backstory pattern, LangGraph's typed state schemas with reducers, OpenAI's structured tool definitions, and DSPy's typed signature approach. Every agent in `~/.anvilbus/agents/<agent-id>/` contains this file alongside its `SOUL.md` and `tools.json`.

```yaml
# ~/.anvilbus/agents/researcher/agent.yaml
# Agent Manifest Specification v1.0.0
# Compatible with: Hermes, CrewAI, LangGraph, AutoGen

# ── Reusable Anchors ──────────────────────────────────────
_defaults:
  model: &default_model
    provider: ollama
    model_id: gemma4:26b-a4b-q4_K_M
    temperature: 0.7
    max_tokens: 4096
  embedder: &default_embedder
    provider: ollama
    model_id: nomic-embed-text
    dimensions: 768
  limits: &default_limits
    max_execution_time_seconds: 300
    max_tool_iterations: 15
    max_tokens_per_turn: 8192
    memory_limit_mb: 512

# ── Agent Definition ──────────────────────────────────────
agent:
  id: researcher                       # Unique, kebab-case, immutable
  version: "1.0.0"                     # SemVer — bump on behavior changes
  api_version: "agent/v1"              # Schema version for manifest validation

  # ── Display ──
  display:
    name: "Research Analyst"
    description: >
      Discovers, validates, and synthesizes information from
      multiple sources into structured research findings.
    icon: "microscope"                 # Lucide icon name
    color_class: "blue"               # Maps to team color in UI palette
    color_hex: "#4A90D9"              # Exact hex for canvas node border
    tags: ["research", "analysis", "solo"]

  # ── Soul / Persona ──
  soul:
    path: ./SOUL.md                    # External markdown persona file
    role: "Senior Research Analyst"
    goal: >
      Discover cutting-edge developments, validate findings across
      multiple sources, produce comprehensive analytical reports.
    constraints:
      - "Always cite sources with URLs"
      - "Express uncertainty explicitly when evidence is inconclusive"
      - "Never fabricate information"

  # ── Model Configuration ──
  model:
    preferred:
      <<: *default_model
    fallback_chain:
      - provider: openrouter
        model_id: qwen/qwen3-32b
        temperature: 0.7
        max_tokens: 4096
      - provider: openrouter
        model_id: google/gemma-3-27b-it:free
        temperature: 0.7
        max_tokens: 4096
    task_overrides:
      deep_analysis:
        provider: ollama
        model_id: qwen3:32b-q4_K_M
        temperature: 0.3

  # ── Tools ──
  tools:
    - id: web_search
      type: builtin
      enabled: true
      permissions:
        max_calls_per_turn: 10
    - id: web_fetch
      type: builtin
      enabled: true
      permissions:
        max_calls_per_turn: 8
        max_response_size_kb: 500
    - id: chroma_search
      type: builtin
      enabled: true
      permissions:
        collections: ["shared_knowledge", "agent_researcher_memory"]
    - id: chroma_store
      type: builtin
      enabled: true
      permissions:
        collections: ["agent_researcher_memory", "pipeline_*_context"]

  # ── Typed I/O Schemas ──
  schemas:
    input:
      type: object
      properties:
        query:
          type: string
          description: "Research question or topic"
        depth:
          type: string
          enum: [shallow, standard, deep]
          default: standard
        context:
          type: string
          default: ""
      required: [query]
    output:
      type: object
      properties:
        report:
          type: string
        sources:
          type: array
          items:
            type: object
            properties:
              url: { type: string }
              title: { type: string }
              relevance: { type: number }
        confidence:
          type: number
          minimum: 0
          maximum: 1
      required: [report, confidence]
    # Payload type from the registry
    payload_type: research_findings

  # ── Memory ──
  memory:
    enabled: true
    short_term:
      backend: chromadb
      collection: "agent_{agent.id}_scratchpad"
      embedder: *default_embedder
      ttl_minutes: 60
    long_term:
      backend: chromadb
      collection: "agent_{agent.id}_memory"
      embedder: *default_embedder
    shared:
      read: ["shared_knowledge"]
      write: ["shared_knowledge"]
    retrieval:
      semantic_weight: 0.6
      recency_weight: 0.3
      importance_weight: 0.1
      default_k: 10
      confidence_threshold: 0.4

  # ── Health ──
  health:
    readiness:
      type: heartbeat
      interval_seconds: 30
      timeout_seconds: 5
    liveness:
      type: process_check
      interval_seconds: 60

  # ── Resource Limits ──
  resource_limits:
    <<: *default_limits

  # ── Execution ──
  execution:
    isolation: subprocess              # docker | subprocess | in_process
    docker_image: null                 # Only for isolation: docker
    working_dir: "./workspace/{run_id}/{agent.id}"
    env_required: []
    env_optional: [SERPER_API_KEY]
```

**Key design decisions:** The `soul.path` field points to the external `SOUL.md` file while keeping inline `role`, `goal`, and `constraints` for quick reference. The `payload_type` field under schemas maps directly to the existing registry (briefing, research_findings, design_spec, etc.). YAML anchors (`*default_model`, `*default_limits`) prevent repetition when defining all 14 agents. The `fallback_chain` provides resilience — if Ollama is slow, the agent transparently falls back to OpenRouter's Qwen3 32B, then to the free Gemma tier.

---

## 2. Pipeline definitions are DAG-first and git-diff friendly

The `pipeline.yaml` format synthesizes patterns from **GitHub Actions** (needs/if/matrix), **Argo Workflows** (DAG tasks, suspend templates, when expressions), **Tekton** (typed params/results), and **Kubeflow** (typed I/O with compile-time validation). Every inter-node message wraps in the existing Universal I/O Envelope.

```yaml
# ~/.anvilbus/pipelines/storefront-build.yaml
pipeline:
  id: "pln_storefront_build"
  name: "Modern Storefront Builder"
  version: "1.0.0"
  description: >
    End-to-end pipeline that designs, builds, tests, and reviews
    a Tauri + React + Tailwind e-commerce storefront application.
  author: "anvilbus-user"
  tags: ["frontend", "e-commerce", "tauri"]
  created: "2026-04-06T00:00:00Z"

# ── Global Parameters ──
params:
  - name: project_name
    type: string
    required: true
    default: "modern-storefront"
  - name: tech_stack
    type: string
    default: "Tauri + React 19 + Tailwind + TypeScript + Zustand"
  - name: design_reference
    type: string
    description: "Path to reference design image or description"

# ── Budget Constraints ──
budget:
  max_cost_usd: 2.00
  warn_at_usd: 1.50
  cost_tracking: true

# ── Defaults ──
defaults:
  timeout_seconds: 600
  retry:
    max_attempts: 2
    backoff: { initial_seconds: 5, multiplier: 2.0 }
  envelope_version: "1.0.0"

# ── Reusable Definitions ──
definitions:
  hitl_review: &hitl_review
    type: human_gate
    timeout_seconds: 86400
    on_timeout: pause
    actions:
      - { id: approve, label: "Approve" }
      - { id: revise, label: "Request Revisions", requires_comment: true }
      - { id: reject, label: "Reject" }

# ── Nodes ──
nodes:

  - id: n1_research
    name: "Research Phase"
    agent_ref: agents/researcher
    overrides:
      model: "balanced"               # Router alias
    inputs:
      - name: query
        type: string
        source: >
          "Best practices for ${params.tech_stack} e-commerce storefront
          with product grid, dark mode, responsive layout"
    outputs:
      - name: findings
        type: object
        payload_type: research_findings
    budget: { max_cost_usd: 0.20 }

  - id: n2_design
    name: "Design Specification"
    agent_ref: agents/designer
    overrides:
      model: "reasoning"
    inputs:
      - name: brief
        type: object
        source: nodes.n1_research.outputs.findings
      - name: reference
        type: string
        source: params.design_reference
    outputs:
      - name: design_spec
        type: object
        payload_type: design_spec
    budget: { max_cost_usd: 0.30 }

  - id: n3_build
    name: "Code Generation"
    agent_ref: agents/builder
    overrides:
      model: "coding"
      isolation: docker
    inputs:
      - name: spec
        type: object
        source: nodes.n2_design.outputs.design_spec
    outputs:
      - name: code
        type: object
        payload_type: code_submission
    budget: { max_cost_usd: 0.50 }
    timeout_seconds: 900

  - id: n4_boris
    name: "QA Validation"
    agent_ref: agents/boris
    overrides:
      model: "balanced"
    inputs:
      - name: submission
        type: object
        source: nodes.n3_build.outputs.code
      - name: spec
        type: object
        source: nodes.n2_design.outputs.design_spec
    outputs:
      - name: verdict
        type: object
        payload_type: prove_it_verdict
    budget: { max_cost_usd: 0.25 }

  - id: n5_review
    name: "Code Review"
    agent_ref: agents/codereview
    overrides:
      model: "reasoning"
    inputs:
      - name: submission
        type: object
        source: nodes.n3_build.outputs.code
      - name: verdict
        type: object
        source: nodes.n4_boris.outputs.verdict
    outputs:
      - name: review
        type: object
        payload_type: compliance_review
    budget: { max_cost_usd: 0.25 }

  - id: n6_human_gate
    name: "Human Review"
    gate:
      <<: *hitl_review
      prompt_template: >
        Review the storefront build. QA verdict: {n4_boris.verdict.pass}.
        Code review score: {n5_review.review.score}/10.
    inputs:
      - name: code
        source: nodes.n3_build.outputs.code
      - name: verdict
        source: nodes.n4_boris.outputs.verdict
      - name: review
        source: nodes.n5_review.outputs.review
    outputs:
      - name: decision
        type: string
      - name: notes
        type: string

  - id: n7_fix
    name: "Apply Fixes"
    agent_ref: agents/builder
    condition:
      if: "nodes.n6_human_gate.outputs.decision == 'revise'"
    inputs:
      - name: code
        source: nodes.n3_build.outputs.code
      - name: feedback
        source: nodes.n6_human_gate.outputs.notes
      - name: review
        source: nodes.n5_review.outputs.review
    outputs:
      - name: fixed_code
        type: object
        payload_type: code_submission
    budget: { max_cost_usd: 0.30 }

# ── Edges ──
edges:
  - { from: n1_research, to: n2_design }
  - { from: n2_design, to: n3_build }
  - { from: n3_build, to: n4_boris }
  - { from: n3_build, to: n5_review }
  - { from: n2_design, to: n4_boris }           # Boris needs spec too
  - { from: n4_boris, to: n6_human_gate }
  - { from: n5_review, to: n6_human_gate }
  - { from: n6_human_gate, to: n7_fix, condition: "decision == 'revise'" }

# ── Execution Config ──
execution:
  mode: dag
  max_parallel_nodes: 2                # n4 and n5 run in parallel
  timeout_seconds: 3600
  on_budget_exceeded: pause_and_notify
  checkpointing:
    enabled: true
    storage: "./workspace/checkpoints/"
```

**The DAG topology** makes this pipeline readable at a glance: Research → Design → Build → (QA ∥ Code Review) → Human Gate → optional Fix. Nodes `n4_boris` and `n5_review` run in parallel since they have no dependency on each other, only on the build output. The `condition` field on `n7_fix` means it only executes if the human requests revisions. Budget caps at **$2.00 total** with per-node limits that sum to $1.80, leaving headroom for retries.

---

## 3. The storefront pipeline chains four agents through typed envelopes

The demo pipeline builds a complete Tauri + React + Tailwind e-commerce storefront by flowing a design specification through **RESEARCHER → DESIGNER → BUILDER → BORIS → CODEREVIEW**, with BORIS and CODEREVIEW running in parallel after the build completes.

### Agent flow with typed payloads

**Node 1 — RESEARCHER** receives a `briefing` payload containing the project requirements (tech stack, features list, design reference colors). It searches for React 19 + Tailwind e-commerce patterns, Tauri desktop app conventions, and product grid implementations. It outputs a `research_findings` payload with component recommendations, library versions, and architectural patterns. The `memory_refs` include a write to `chromadb://pipeline_storefront/research_context` so downstream agents can recall findings.

**Node 2 — DESIGNER** receives the research findings and the raw design reference (color palette, button gradients, typography specs). It produces a `design_spec` payload — the critical handoff document — containing:

```yaml
# Designer's design_spec output (inside envelope payload.content)
design_system:
  colors:
    light:
      bg_primary: "#FFFFFF"
      bg_secondary: "#F2F2F5"
      bg_accent: "#292A21"
    dark:
      bg_primary: "#1D1D1F"
      bg_secondary: "#2D2D2F"
      bg_accent: "#293E46"
  buttons:
    buy_now:
      light: { gradient: ["#D1D0D1", "#313B3E"], text: "#FFFFFF" }
      dark: { gradient: ["#1B9F18", "#018535"], text: "#FFFFFF" }
    browse:
      light: { gradient: ["#1222F5", "#D1D1D5"], text: "#264855" }
      dark: { gradient: ["#2222F6", "#233355"], text: "#A6B8B8" }
    add_to_cart:
      light: { gradient: ["#0071E3", "#004B9B"], text: "#FFFFFF" }
      dark: { gradient: ["#3071E3", "#ED71EB"], text: "#FFFFFF" }
  typography:
    primary_font: "Inter"
    fallback: "SF Pro Display, system-ui, sans-serif"
    weights: [400, 500, 600, 700]
  components:
    - name: ProductCard
      props: [image, title, price, rating, cta_variant]
    - name: NavBar
      items: [New Arrivals, Product Showcase, Special Offers, Favorites]
    - name: ThemeToggle
      behavior: "Zustand persisted, system preference detection"
  layout:
    grid: "responsive 1-2-3-4 columns at sm/md/lg/xl breakpoints"
    max_width: "1280px"
  file_structure:
    - src/components/ProductCard.tsx
    - src/components/NavBar.tsx
    - src/components/Button.tsx
    - src/components/ThemeToggle.tsx
    - src/store/themeStore.ts
    - src/data/mockProducts.ts
    - src/App.tsx
```

**Node 3 — BUILDER** receives the design spec and generates complete TypeScript source files. Its `code_submission` payload contains the full file tree with contents, the `package.json` dependencies, and the Tailwind config. The builder works inside a Docker sandbox where it can run `npm create tauri-app`, install dependencies, and verify the project compiles. Its output includes a `build_status` (compiled/failed) and any compiler warnings.

**Node 4 — BORIS** (QA) and **Node 5 — CODEREVIEW** run in parallel:

**BORIS** receives both the `code_submission` from BUILDER and the original `design_spec` from DESIGNER. It validates: Does the code implement all components listed in the spec? Do the hex colors match exactly? Are all button variants present? Does the responsive grid match the specified breakpoints? Does dark mode toggle work? Its `prove_it_verdict` output contains a pass/fail boolean, a checklist of verified items, and specific failure details with file paths and line numbers.

**CODEREVIEW** receives the `code_submission` and BORIS's verdict. It evaluates: TypeScript type safety, React 19 best practices (no deprecated patterns), Tailwind class organization, Zustand store design, component composition, accessibility (ARIA labels, keyboard navigation), performance (memo usage, lazy loading). Its `compliance_review` output includes a numeric score (0-10), categorized findings (critical/warning/info), and suggested fixes.

### Data flow summary

```
RESEARCHER                    DESIGNER                    BUILDER
┌─────────────┐     ┌──────────────────┐     ┌───────────────────┐
│ briefing    │────▶│ research_findings│────▶│ design_spec       │
│             │     │ + design_ref     │     │                   │
└─────────────┘     └──────────────────┘     └─────────┬─────────┘
                                                       │
                                              code_submission
                                                       │
                                          ┌────────────┴────────────┐
                                          ▼                         ▼
                                   ┌─────────────┐         ┌──────────────┐
                                   │   BORIS     │         │  CODEREVIEW  │
                                   │ (QA check)  │         │ (quality)    │
                                   └──────┬──────┘         └──────┬───────┘
                                          │                       │
                                  prove_it_verdict      compliance_review
                                          │                       │
                                          └───────────┬───────────┘
                                                      ▼
                                               HUMAN GATE
```

Each node wraps its output in the Universal I/O Envelope, recording `model_used`, `cost_usd`, `tokens`, and `duration_ms`. The `memory_refs` accumulate — DESIGNER writes its spec to `chromadb://pipeline_storefront/design_spec` so BORIS can independently retrieve it for cross-referencing, reducing the need to pass the full spec through the envelope chain.

---

## 4. Canvas UI builds on React Flow 12.8 with Zustand state

The React component tree separates **layout concerns** (panels, canvas) from **domain components** (agent nodes, typed connections) and **overlay components** (execution status, inspector).

### Component tree

```
<App>
├── <ThemeProvider>                    # Light/dark mode via Zustand
├── <AppLayout>                        # CSS Grid: sidebar | canvas | inspector
│   ├── <AgentPalette>                 # Left sidebar (240px)
│   │   ├── <PaletteSearch>            # Text filter + team dropdown
│   │   ├── <PaletteSection team="ops">
│   │   │   └── <DraggableAgentCard>   # HTML DnD source
│   │   │       ├── <AgentIcon>
│   │   │       ├── <AgentLabel>
│   │   │       └── <AgentBadge>       # Model preference indicator
│   │   ├── <PaletteSection team="dev">
│   │   └── <PaletteSection team="solo">
│   │
│   ├── <PipelineCanvas>              # Center (flex-1)
│   │   └── <ReactFlow>
│   │       ├── <Background variant="dots" />
│   │       ├── <MiniMap />
│   │       ├── <Controls />
│   │       ├── <Panel position="top-right">
│   │       │   └── <ExecutionToolbar>  # Run, Pause, Stop, Cost display
│   │       ├── nodeTypes:
│   │       │   ├── <AgentNode>         # Custom node component
│   │       │   │   ├── <NodeHeader>    # Color band, icon, name, expand toggle
│   │       │   │   ├── <NodeBody>      # Collapsed: I/O summary; Expanded: full config
│   │       │   │   │   ├── <HandleGroup type="target">   # Typed input handles
│   │       │   │   │   └── <HandleGroup type="source">   # Typed output handles
│   │       │   │   └── <NodeStatusBadge>                  # idle/running/done/error
│   │       │   └── <HitlGateNode>     # Special node for human gates
│   │       └── edgeTypes:
│   │           └── <TypedEdge>        # Color-coded by payload type, animated when running
│   │
│   └── <InspectorPanel>              # Right sidebar (320px, collapsible)
│       ├── <InspectorTabs>
│       │   ├── Tab: "Config"
│       │   │   ├── <AgentConfigForm>  # Model, temperature, tools toggles
│       │   │   └── <SchemaViewer>     # Input/output JSON Schema display
│       │   ├── Tab: "Soul"
│       │   │   └── <SoulEditor>       # Markdown editor for SOUL.md
│       │   ├── Tab: "Execution"
│       │   │   ├── <RunHistory>
│       │   │   ├── <CostBreakdown>
│       │   │   └── <EnvelopeViewer>   # JSON tree view of last I/O envelope
│       │   └── Tab: "Logs"
│       │       └── <LogStream>        # Streaming stdout/stderr from agent
│       └── <PipelineMetaForm>         # Name, version, budget (shown when no node selected)
│
├── <ExecutionOverlay>                 # Full-canvas overlay during pipeline run
│   ├── <ProgressBar>                  # Overall pipeline progress
│   ├── <NodeProgressIndicator>        # Per-node: spinner, checkmark, X
│   ├── <CostTicker>                   # Real-time running cost
│   └── <HitlModal>                    # Modal for human approval gates
│
└── <StatusBar>                        # Bottom: connection status, Ollama health, model loaded
```

### Typed connection validation

The `isValidConnection` callback on `<ReactFlow>` enforces payload type compatibility. Each Handle carries a `data-payload-type` attribute (e.g., `research_findings`, `design_spec`, `code_submission`). The validator checks that the source handle's output type matches the target handle's expected input type from the agent's schema:

```typescript
const isValidConnection: IsValidConnection = useCallback((connection) => {
  const sourceNode = nodes.find(n => n.id === connection.source);
  const targetNode = nodes.find(n => n.id === connection.target);
  const sourceType = sourceNode?.data?.outputPayloadType;
  const targetAccepts = targetNode?.data?.inputAcceptTypes; // string[]
  return targetAccepts?.includes(sourceType) ?? false;
}, [nodes]);
```

Invalid connections show a red dashed line during drag; valid connections snap with a green pulse. The `nodeTypes` object **must be defined outside the component** to prevent React Flow from remounting nodes on every render — a critical performance requirement.

### State management with Zustand

The store separates **flow state** (nodes, edges, viewport — managed by React Flow's `applyNodeChanges`/`applyEdgeChanges`) from **domain state** (agent configs, pipeline metadata, execution status, cost ledger). This prevents React Flow internal updates from triggering domain re-renders. The `useShallow` selector from Zustand prevents unnecessary array-reference-change re-renders.

---

## 5. Tauri project structure organizes Rust backend and React frontend

```
anvilbus/
├── src-tauri/                            # Rust backend
│   ├── Cargo.toml
│   ├── tauri.conf.json                   # Window config, app identifier
│   ├── capabilities/
│   │   └── default.json                  # fs, shell, dialog permissions
│   ├── icons/
│   ├── build.rs
│   └── src/
│       ├── main.rs                       # Entry point
│       ├── lib.rs                        # Plugin registration, command handlers
│       ├── commands/
│       │   ├── mod.rs
│       │   ├── agents.rs                 # load_agents, save_agent_config
│       │   ├── pipelines.rs              # load_pipeline, save_pipeline, run_pipeline
│       │   ├── execution.rs              # start_run, pause_run, cancel_run
│       │   ├── models.rs                 # ollama_status, list_models, warm_model
│       │   └── chromadb.rs               # query_collection, store_document
│       ├── engine/
│       │   ├── mod.rs
│       │   ├── orchestrator.rs           # Pipeline state machine
│       │   ├── runner.rs                 # Agent process spawning
│       │   ├── envelope.rs               # I/O envelope serialization
│       │   ├── cost_ledger.rs            # Budget tracking
│       │   └── state_machine.rs          # FSM implementation
│       └── router/
│           ├── mod.rs
│           └── litellm.rs                # LiteLLM proxy client
│
├── src/                                  # React frontend
│   ├── main.tsx                          # React root + Tauri setup
│   ├── App.tsx                           # Router + ThemeProvider
│   ├── components/
│   │   ├── canvas/
│   │   │   ├── PipelineCanvas.tsx        # ReactFlow wrapper
│   │   │   ├── AgentNode.tsx             # Custom node (memoized)
│   │   │   ├── HitlGateNode.tsx          # Human gate node
│   │   │   ├── TypedEdge.tsx             # Custom edge with type coloring
│   │   │   ├── HandleGroup.tsx           # Typed handle renderer
│   │   │   └── ExecutionOverlay.tsx      # Run status overlay
│   │   ├── palette/
│   │   │   ├── AgentPalette.tsx          # Left sidebar
│   │   │   ├── DraggableAgentCard.tsx    # Drag source
│   │   │   └── PaletteSearch.tsx         # Filter/search
│   │   ├── inspector/
│   │   │   ├── InspectorPanel.tsx        # Right sidebar
│   │   │   ├── AgentConfigForm.tsx       # Model/tool config
│   │   │   ├── SoulEditor.tsx            # SOUL.md markdown editor
│   │   │   ├── SchemaViewer.tsx          # JSON Schema display
│   │   │   ├── EnvelopeViewer.tsx        # I/O envelope JSON tree
│   │   │   └── CostBreakdown.tsx         # Per-node cost table
│   │   ├── execution/
│   │   │   ├── ExecutionToolbar.tsx       # Run/Pause/Stop controls
│   │   │   ├── CostTicker.tsx            # Live cost counter
│   │   │   ├── HitlModal.tsx             # Human approval modal
│   │   │   └── LogStream.tsx             # Streaming log viewer
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx             # Grid layout shell
│   │   │   ├── StatusBar.tsx             # Bottom status bar
│   │   │   └── ThemeToggle.tsx           # Light/dark mode switch
│   │   └── ui/                           # Shared primitives
│   │       ├── Button.tsx
│   │       ├── Badge.tsx
│   │       ├── Tabs.tsx
│   │       └── Tooltip.tsx
│   ├── stores/
│   │   ├── flowStore.ts                  # React Flow nodes/edges state
│   │   ├── pipelineStore.ts              # Pipeline metadata, params, budget
│   │   ├── executionStore.ts             # Run state, cost ledger, logs
│   │   ├── agentRegistryStore.ts         # Loaded agent manifests
│   │   └── themeStore.ts                 # Light/dark mode preference
│   ├── hooks/
│   │   ├── useAgentDragDrop.ts           # DnD from palette to canvas
│   │   ├── useConnectionValidator.ts     # Typed edge validation
│   │   ├── usePipelineSerializer.ts      # toObject → YAML conversion
│   │   ├── useTauriCommands.ts           # Typed invoke wrappers
│   │   └── useExecutionStream.ts         # Tauri event listener for run updates
│   ├── lib/
│   │   ├── yaml.ts                       # js-yaml serialize/deserialize
│   │   ├── envelope.ts                   # I/O envelope type definitions
│   │   ├── validation.ts                 # Schema validation helpers
│   │   └── cost.ts                       # Cost calculation utilities
│   ├── types/
│   │   ├── agent.ts                      # AgentManifest TypeScript type
│   │   ├── pipeline.ts                   # PipelineDefinition type
│   │   ├── envelope.ts                   # UniversalEnvelope type
│   │   └── router.ts                     # ModelConfig type
│   └── styles/
│       └── globals.css                   # Tailwind directives + custom properties
│
├── public/
│   └── icons/                            # Agent icons (SVG)
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
└── README.md
```

**Tauri capabilities** in `src-tauri/capabilities/default.json` must explicitly grant: `fs:allow-read-text-file`, `fs:allow-write-text-file` (scoped to `~/.anvilbus/`), `shell:allow-execute` for `docker` and `ollama` binaries, and `dialog:allow-open` for file picker access. The Tauri v2 API uses `@tauri-apps/api/core` for `invoke()` and `@tauri-apps/api/event` for `listen()` — different import paths from v1. Communication between the Rust execution engine and React UI flows through **Tauri events**: the engine emits `node-started`, `node-completed`, `cost-update`, and `hitl-request` events that the frontend consumes via `useExecutionStream`.

---

## 6. Tailwind config encodes the complete design system

```javascript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',

  theme: {
    extend: {
      // ── Design Schema Colors ──
      colors: {
        // Light mode surfaces
        surface: {
          primary: '#FFFFFF',
          secondary: '#F2F2F5',
          accent: '#292A21',
        },
        // Dark mode surfaces (applied via dark: prefix)
        'dark-surface': {
          primary: '#1D1D1F',
          secondary: '#2D2D2F',
          accent: '#293E46',
        },
        // Accent pills
        pill: {
          charcoal: '#292A21',
          silver: '#F2F2F5',
          'dark-silver': '#2D2D2F',
        },
        // Agent team colors (for canvas nodes)
        agent: {
          ops: '#4A90D9',       // Operations team - blue
          dev: '#50C878',       // Development team - green
          intel: '#FFB347',     // Intelligence team - amber
          solo: '#9B59B6',      // Solo agents - purple
        },
        // Payload type colors (for typed edges)
        payload: {
          briefing: '#6366F1',
          research: '#3B82F6',
          design: '#8B5CF6',
          code: '#10B981',
          verdict: '#F59E0B',
          review: '#EF4444',
          signal: '#EC4899',
        },
        // Status colors
        status: {
          running: '#3B82F6',
          success: '#10B981',
          error: '#EF4444',
          paused: '#F59E0B',
          idle: '#6B7280',
        },
      },

      // ── Button Gradients (as CSS custom properties) ──
      backgroundImage: {
        // Light mode buttons
        'btn-buy-light': 'linear-gradient(135deg, #D1D0D1, #313B3E)',
        'btn-browse-light': 'linear-gradient(135deg, #1222F5, #D1D1D5)',
        'btn-cart-light': 'linear-gradient(135deg, #0071E3, #004B9B)',
        // Dark mode buttons
        'btn-buy-dark': 'linear-gradient(135deg, #1B9F18, #018535)',
        'btn-browse-dark': 'linear-gradient(135deg, #2222F6, #233355)',
        'btn-cart-dark': 'linear-gradient(135deg, #3071E3, #ED71EB)',
        // Accent pill gradients - Light
        'pill-charcoal-light': 'linear-gradient(135deg, #292A21, #3D3E35)',
        'pill-silver-light': 'linear-gradient(135deg, #F2F2F5, #E5E5E8)',
        'pill-dark-silver-light': 'linear-gradient(135deg, #6B6B6E, #4A4A4D)',
        // Accent pill gradients - Dark
        'pill-charcoal-dark': 'linear-gradient(135deg, #3D3E35, #292A21)',
        'pill-silver-dark': 'linear-gradient(135deg, #4A4A4D, #3D3D40)',
        'pill-dark-silver-dark': 'linear-gradient(135deg, #2D2D2F, #1D1D1F)',
      },

      // ── Typography ──
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        'display-xl': ['3.5rem', { lineHeight: '1.1', fontWeight: '700' }],
        'display-lg': ['2.5rem', { lineHeight: '1.15', fontWeight: '700' }],
        'display-md': ['2rem', { lineHeight: '1.2', fontWeight: '600' }],
        'display-sm': ['1.5rem', { lineHeight: '1.25', fontWeight: '600' }],
        'body-lg': ['1.125rem', { lineHeight: '1.6', fontWeight: '400' }],
        'body-md': ['1rem', { lineHeight: '1.5', fontWeight: '400' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],
        'caption': ['0.75rem', { lineHeight: '1.4', fontWeight: '500' }],
      },

      // ── Layout ──
      maxWidth: {
        'storefront': '1280px',
      },
      gridTemplateColumns: {
        'app': '240px 1fr 320px',           // palette | canvas | inspector
        'app-collapsed': '240px 1fr 48px',  // inspector collapsed
        'products-sm': 'repeat(1, 1fr)',
        'products-md': 'repeat(2, 1fr)',
        'products-lg': 'repeat(3, 1fr)',
        'products-xl': 'repeat(4, 1fr)',
      },

      // ── Animations ──
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flow-edge': 'flowDash 1.5s linear infinite',
        'cost-tick': 'costTick 0.3s ease-out',
      },
      keyframes: {
        flowDash: {
          '0%': { strokeDashoffset: '24' },
          '100%': { strokeDashoffset: '0' },
        },
        costTick: {
          '0%': { transform: 'scale(1.2)', color: '#EF4444' },
          '100%': { transform: 'scale(1)', color: 'inherit' },
        },
      },

      // ── Spacing ──
      spacing: {
        'node-w': '280px',       // Agent node width
        'node-w-expanded': '360px',
        'palette-w': '240px',
        'inspector-w': '320px',
      },

      // ── Shadows ──
      boxShadow: {
        'node': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'node-hover': '0 4px 16px rgba(0, 0, 0, 0.12)',
        'node-active': '0 0 0 2px rgba(59, 130, 246, 0.5)',
        'node-error': '0 0 0 2px rgba(239, 68, 68, 0.5)',
      },

      // ── Border Radius ──
      borderRadius: {
        'node': '12px',
        'pill': '9999px',
      },
    },
  },

  plugins: [],
}

export default config
```

**Global CSS** (`src/styles/globals.css`) sets up the dark mode surface swap:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-surface-primary text-surface-accent font-sans antialiased;
  }
  .dark body {
    @apply bg-dark-surface-primary text-gray-100;
  }
}

@layer components {
  .btn-buy {
    @apply bg-btn-buy-light text-white font-semibold px-6 py-3 rounded-pill
           transition-all duration-200 hover:opacity-90 active:scale-[0.98];
  }
  .dark .btn-buy {
    @apply bg-btn-buy-dark;
  }
  .btn-browse {
    @apply bg-btn-browse-light font-semibold px-6 py-3 rounded-pill
           transition-all duration-200 hover:opacity-90 active:scale-[0.98];
    color: #264855;
  }
  .dark .btn-browse {
    @apply bg-btn-browse-dark;
    color: #A6B8B8;
  }
  .btn-cart {
    @apply bg-btn-cart-light text-white font-semibold px-6 py-3 rounded-pill
           transition-all duration-200 hover:opacity-90 active:scale-[0.98];
  }
  .dark .btn-cart {
    @apply bg-btn-cart-dark;
  }
}
```

---

## 7. Model router abstracts three providers behind LiteLLM

The router runs as a LiteLLM proxy on `localhost:4000`, providing an OpenAI-compatible API that all agents call regardless of which provider ultimately serves the request. On a **24GB VRAM 7900 XTX**, only one 26-32B model fits at a time — the router handles model swapping via Ollama's `keep_alive` parameter.

```yaml
# ~/.anvilbus/config/router.yaml
# Runtime: litellm --config router.yaml --port 4000

model_list:
  # ── LOCAL: Ollama on AMD RX 7900 XTX ──
  - model_name: balanced                # Alias used by agents
    litellm_params:
      model: ollama_chat/gemma4:26b-a4b-q4_K_M
      api_base: "http://localhost:11434"
      keep_alive: "15m"
      stream: true
    model_info:
      input_cost_per_token: 0
      output_cost_per_token: 0
      max_tokens: 32768
      supports_function_calling: true
      supports_vision: true

  - model_name: reasoning
    litellm_params:
      model: ollama_chat/qwen3:32b-q4_K_M
      api_base: "http://localhost:11434"
      keep_alive: "15m"
      stream: true
    model_info:
      input_cost_per_token: 0
      output_cost_per_token: 0
      max_tokens: 32768
      supports_function_calling: true

  - model_name: fast
    litellm_params:
      model: ollama_chat/gemma4:e4b-q8_0
      api_base: "http://localhost:11434"
      keep_alive: "30m"
      stream: true
    model_info:
      input_cost_per_token: 0
      output_cost_per_token: 0
      max_tokens: 8192
      supports_function_calling: true
      supports_vision: true

  - model_name: embed
    litellm_params:
      model: ollama/nomic-embed-text
      api_base: "http://localhost:11434"
      keep_alive: "60m"
    model_info:
      input_cost_per_token: 0
      output_cost_per_token: 0
      mode: embedding

  # ── CLOUD: OpenRouter ──
  - model_name: coding
    litellm_params:
      model: openrouter/z-ai/glm-4.7
      api_key: "os.environ/OPENROUTER_API_KEY"
      api_base: "https://openrouter.ai/api/v1"
    model_info:
      input_cost_per_token: 0.00000039
      output_cost_per_token: 0.00000175
      max_tokens: 203000
      supports_function_calling: true

  - model_name: coding-fast
    litellm_params:
      model: openrouter/z-ai/glm-4.7-flash
      api_key: "os.environ/OPENROUTER_API_KEY"
      api_base: "https://openrouter.ai/api/v1"
    model_info:
      input_cost_per_token: 0.00000006
      output_cost_per_token: 0.0000004
      max_tokens: 203000
      supports_function_calling: true

  - model_name: budget
    litellm_params:
      model: openrouter/qwen/qwen3-32b
      api_key: "os.environ/OPENROUTER_API_KEY"
      api_base: "https://openrouter.ai/api/v1"
    model_info:
      input_cost_per_token: 0.00000008
      output_cost_per_token: 0.00000024
      max_tokens: 41000
      supports_function_calling: true

  - model_name: free
    litellm_params:
      model: openrouter/google/gemma-3-27b-it:free
      api_key: "os.environ/OPENROUTER_API_KEY"
      api_base: "https://openrouter.ai/api/v1"
    model_info:
      input_cost_per_token: 0
      output_cost_per_token: 0
      max_tokens: 131072
      supports_function_calling: true
      supports_vision: true

  # ── ANTHROPIC: Meridian Proxy (primary) + Direct (fallback) ──
  - model_name: premium
    litellm_params:
      model: anthropic/claude-sonnet-4-20250514
      api_key: "os.environ/MERIDIAN_PROXY_API_KEY"
      api_base: "os.environ/MERIDIAN_PROXY_BASE_URL"
    model_info:
      input_cost_per_token: 0.000003
      output_cost_per_token: 0.000015
      max_tokens: 64000
      supports_function_calling: true
      supports_vision: true
    order: 1

  - model_name: premium
    litellm_params:
      model: anthropic/claude-sonnet-4-20250514
      api_key: "os.environ/ANTHROPIC_API_KEY"
    model_info:
      input_cost_per_token: 0.000003
      output_cost_per_token: 0.000015
      max_tokens: 64000
      supports_function_calling: true
      supports_vision: true
    order: 2

router_settings:
  routing_strategy: simple-shuffle
  fallbacks:
    - balanced: ["free", "budget"]
    - reasoning: ["budget", "coding"]
    - coding: ["coding-fast", "budget"]
    - premium: ["coding", "reasoning"]
    - fast: ["coding-fast", "free"]
  context_window_fallbacks:
    - balanced: ["budget"]
    - reasoning: ["coding"]
    - fast: ["balanced"]
  num_retries: 3
  timeout: 120
  allowed_fails: 3
  cooldown_time: 60
  model_group_alias:
    "agentic": "balanced"
    "web-research": "balanced"
    "light": "fast"
    "zero-cost": "fast"
  enable_pre_call_checks: true

litellm_settings:
  count_tokens: true
  drop_params: true
  cache: true
  cache_params:
    type: local
    ttl: 1800

general_settings:
  master_key: "os.environ/LITELLM_MASTER_KEY"
  background_health_checks: true
  health_check_interval: 120
  enable_health_check_routing: true
```

**How agents use this:** Each agent's `agent.yaml` specifies `model: "balanced"` or `model: "coding"` — these are the `model_name` aliases in the router. The agent calls `POST http://localhost:4000/v1/chat/completions` with `model: "balanced"`. LiteLLM resolves this to the local Gemma 4 26B, falling back to the free OpenRouter Gemma 3 27B if Ollama is unresponsive. **Cost at $6-12/month:** Local models handle 80%+ of requests at zero cost. The `coding` tier (GLM 4.7 via OpenRouter at **$0.39/$1.75 per million tokens**) and the `budget` tier (Qwen3 32B at **$0.08/$0.24 per million**) cover cloud overflow cheaply. Claude Sonnet as `premium` is reserved for complex orchestration — the fallback chain ensures it's only called when cheaper models can't handle the task.

---

## 8. The execution engine uses a hybrid isolation model with pre-flight budget checks

The engine runs inside the Tauri Rust backend, managing the pipeline state machine, agent process lifecycle, cost ledger, and ChromaDB integration.

### Three-tier process isolation

**Tier 1 — Docker containers** for untrusted agents that execute arbitrary code (BUILDER, agents with terminal access). Each container gets resource limits (4GB RAM, 2 CPUs), a mounted workspace volume (`/workspace/{run_id}/{node_id}/`), and read-only access to the ChromaDB data directory. AMD GPU passthrough requires mounting `/dev/kfd` and `/dev/dri` with `HSA_OVERRIDE_GFX_VERSION=11.0.0`.

**Tier 2 — Subprocesses** for semi-trusted agents (RESEARCHER, DESIGNER, CODEREVIEW). Faster startup (~50ms vs 1-3s for Docker), OS-level isolation, IPC via stdin/stdout pipes carrying JSON envelopes.

**Tier 3 — In-process** for trusted internal agents (Hermes brain, simple routing agents). Zero overhead but no isolation — used only for agents that never execute untrusted code.

### Pipeline state machine

Each pipeline run transitions through: `PENDING → VALIDATING → READY → RUNNING → COMPLETED`. Each node within the run follows: `INIT → VALIDATE → EXECUTE → COLLECT → PASS → COMPLETE`. The state machine serializes to SQLite after every transition, enabling checkpoint/resume — if the process crashes mid-pipeline, it restarts from the last completed node.

### Pre-flight budget enforcement

Before invoking any agent, the engine performs a **reserve-commit** pattern:

1. **Estimate** the request cost from input token count × model pricing
2. **Reserve** that amount from the remaining budget (atomic operation)
3. **Execute** the agent
4. **Commit** the actual cost (release reservation, record real spend)
5. **Check alerts** at 50%, 80%, 95% thresholds

If the estimated cost exceeds the remaining budget, the engine either blocks the node (switches to a cheaper fallback model), pauses for human approval, or terminates the pipeline — depending on the `on_budget_exceeded` policy. For local Ollama models, cost is **$0.00** so budget checks pass instantly.

### State passing between agents

All inter-agent communication flows through the Universal I/O Envelope written as JSON files in the shared workspace:

```
/workspace/{run_id}/
├── envelopes/
│   ├── n1_research_input.json
│   ├── n1_research_output.json     # → transformed to n2 input
│   ├── n2_design_input.json
│   ├── n2_design_output.json
│   └── ...
├── artifacts/
│   ├── n3_build/                    # Generated source files
│   └── n4_boris/                    # QA test results
├── checkpoints/
│   ├── after_n1.bin                 # Serialized pipeline state
│   └── after_n3.bin
└── cost_ledger.json                 # Running cost accumulation
```

The orchestrator reads each node's output envelope, validates the schema, applies the edge mapping transformations (renaming fields, collecting fan-out results into arrays), and writes the next node's input envelope. This file-based approach works across all three isolation tiers and produces a complete audit trail.

### HITL gates pause the state machine

When execution reaches a HITL gate node, the engine: (1) serializes the full checkpoint, (2) transitions to `PAUSED`, (3) emits a `hitl-request` Tauri event to the frontend with an evidence pack (the upstream agent's output, confidence score, cost so far), and (4) waits. The frontend renders a modal with Approve/Revise/Reject buttons. On human decision, the engine resumes from checkpoint with the decision applied. A configurable timeout (default 24 hours) auto-escalates or auto-approves if the human doesn't respond.

### ChromaDB collection architecture

```
shared_knowledge           ← All agents READ, ingestion pipeline WRITES
pipeline_{run_id}_context  ← Agents in same pipeline R/W, deleted after run
agent_{id}_memory          ← Single agent R/W (persistent episodic memory)
agent_{id}_scratchpad      ← Single agent R/W (cleared per pipeline run)
```

ChromaDB runs as a **PersistentClient** at `~/.anvilbus/chromadb/` using `all-MiniLM-L6-v2` for local embeddings (384 dimensions, no API calls). Each agent declares which collections it can read/write in its `agent.yaml` memory config. The orchestrator enforces these permissions — a RESEARCHER agent cannot write to BUILDER's private memory collection.

---

## Implementation sequence builds foundation first

The build order reflects strict dependencies. Each phase unlocks the next.

**Phase 1 — Foundation (Week 1-2):** Set up the Tauri + React + Vite project scaffold. Install `@xyflow/react`, Zustand, `js-yaml`, Tailwind. Implement the `tailwind.config.ts` with the full design system. Build the `AppLayout` grid with placeholder panels. Create the Zustand stores (flow, pipeline, theme). Implement YAML serialization for agent manifests and pipelines. Write the TypeScript types for `AgentManifest`, `PipelineDefinition`, and `UniversalEnvelope`.

**Phase 2 — Canvas Core (Week 3-4):** Build the `AgentNode` custom React Flow component with collapse/expand. Implement `HandleGroup` with typed handles. Wire up `isValidConnection` for payload type checking. Build `AgentPalette` with HTML DnD producing nodes on the canvas. Implement `InspectorPanel` with config form and SOUL.md editor. Add pipeline save/load via Tauri fs plugin (YAML read/write to `~/.anvilbus/`).

**Phase 3 — Model Router (Week 5):** Deploy LiteLLM proxy with the `router.yaml` config. Verify Ollama local models work through the proxy. Test fallback chains (kill Ollama, verify cloud fallback). Build the Tauri `models.rs` command module for health checks and model warm-up. Wire StatusBar to show Ollama health and loaded model.

**Phase 4 — Execution Engine (Week 6-7):** Implement the pipeline state machine in Rust. Build the cost ledger with reserve-commit pattern. Implement subprocess agent runner (Tier 2 first — simpler than Docker). Wire Tauri events for execution status streaming to frontend. Build `ExecutionOverlay` and `CostTicker` components. Implement HITL gate pause/resume.

**Phase 5 — Docker + ChromaDB (Week 8-9):** Add Docker container runner (Tier 1) for BUILDER agent. Configure AMD GPU passthrough for local model inference inside containers. Set up ChromaDB PersistentClient with collection naming conventions. Implement `chroma_search` and `chroma_store` tools for agents. Wire memory_refs in envelope processing.

**Phase 6 — Demo Pipeline (Week 10):** Define and test the storefront build pipeline. Run RESEARCHER → DESIGNER → BUILDER → BORIS ∥ CODEREVIEW → HITL. Iterate on agent SOUL.md files to improve output quality. Validate the full cost stays under $2.00 per pipeline run.

---

## Conclusion: a practical architecture for a solo developer

This architecture achieves three design goals simultaneously. **Local-first operation** means 80%+ of agent invocations hit Ollama at zero cost, with the LiteLLM router transparently falling back to OpenRouter's sub-penny models when cloud is needed. **Framework agnosticism** comes from the agent.yaml manifest — the same spec works whether Hermes, CrewAI, or LangGraph orchestrates execution, because the typed I/O envelope is the integration contract, not any framework's internal API. **Visual composability** comes from React Flow's typed handles and the pipeline YAML's explicit edge definitions — what you wire on the canvas serializes directly to the git-friendly YAML that the execution engine consumes.

The hardware constraint (single 24GB GPU) drives a key architectural decision: the model router uses `keep_alive`-based model swapping rather than concurrent model loading. Only one 26-32B model fits in VRAM at a time, but the 5-minute keep-alive means sequential pipeline nodes reuse the warm model without reload delays. For the rare case where two nodes need different local models simultaneously, the `max_parallel_nodes: 2` constraint in the pipeline YAML plus the router's fallback chain ensures one goes local and the other goes to OpenRouter's equivalent at fractional cost.

The most novel element is the **reserve-commit cost ledger** that treats LLM API budget like a database transaction — reserving estimated cost before execution, committing actual cost after, and enforcing hard limits before any token is generated. Combined with per-node budget caps in the pipeline YAML, this makes a $2.00 storefront build pipeline genuinely achievable rather than aspirational.