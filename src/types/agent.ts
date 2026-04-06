export interface AgentDisplay {
  name: string
  description: string
  icon: string
  color_class: string
  color_hex: string
  tags: string[]
}

export interface AgentSoul {
  path: string
  role: string
  goal: string
  constraints: string[]
}

export interface ModelConfig {
  provider: string
  model_id: string
  temperature: number
  max_tokens: number
}

export interface AgentModel {
  preferred: ModelConfig
  fallback_chain: ModelConfig[]
  task_overrides?: Record<string, ModelConfig>
}

export interface AgentTool {
  id: string
  type: 'builtin' | 'mcp' | 'custom'
  enabled: boolean
  permissions: Record<string, unknown>
}

export interface AgentSchemas {
  input: Record<string, unknown>
  output: Record<string, unknown>
  payload_type: string
}

export interface AgentMemory {
  enabled: boolean
  short_term: { backend: string; collection: string; ttl_minutes: number }
  long_term: { backend: string; collection: string }
  shared: { read: string[]; write: string[] }
  retrieval: { semantic_weight: number; recency_weight: number; importance_weight: number; default_k: number; confidence_threshold: number }
}

export interface AgentHealth {
  readiness: { type: string; interval_seconds: number; timeout_seconds: number }
  liveness: { type: string; interval_seconds: number }
}

export interface AgentExecution {
  isolation: 'docker' | 'subprocess' | 'in_process'
  docker_image: string | null
  working_dir: string
  env_required: string[]
  env_optional: string[]
}

export interface AgentResourceLimits {
  max_execution_time_seconds: number
  max_tool_iterations: number
  max_tokens_per_turn: number
  memory_limit_mb: number
}

export interface AgentManifest {
  id: string
  version: string
  api_version: string
  display: AgentDisplay
  soul: AgentSoul
  model: AgentModel
  tools: AgentTool[]
  schemas: AgentSchemas
  memory: AgentMemory
  health: AgentHealth
  execution: AgentExecution
  resource_limits: AgentResourceLimits
}
