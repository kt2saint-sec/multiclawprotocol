export type EnvelopeStatus = 'pending' | 'running' | 'success' | 'partial' | 'failed' | 'blocked_hitl'

export interface EnvelopeMeta {
  pipeline_id: string
  run_id: string
  node_id: string
  parent_node_ids?: string[]
  timestamp: string
  agent_id: string
  agent_version?: string
  model_used: string
  cost_usd: number
  tokens: { input: number; output: number; cached?: number }
  duration_ms: number
}

export interface EnvelopeHistoryEntry {
  node_id: string
  agent_id: string
  summary: string
  payload_type: string
}

export interface EnvelopeConstraints {
  budget_usd?: number
  deadline?: string
  forbidden_actions?: string[]
}

export interface EnvelopeContext {
  task: string
  user_intent?: string
  history: EnvelopeHistoryEntry[]
  constraints?: EnvelopeConstraints
}

export interface EnvelopePayload {
  type: string
  schema_version: string
  content: unknown
  confidence?: number
}

export interface MemoryRef {
  uri: string
  role: 'read' | 'write'
  relevance?: number
}

export interface EnvelopeError {
  code: string
  message: string
  recoverable?: boolean
  suggested_action?: string
}

export interface EnvelopeHitl {
  reason: string
  question: string
  options?: string[]
}

export interface EnvelopeTrace {
  step: string
  detail: string
  timestamp: string
}

export interface UniversalEnvelope {
  version: string
  meta: EnvelopeMeta
  context: EnvelopeContext
  payload: EnvelopePayload
  memory_refs: MemoryRef[]
  status: EnvelopeStatus
  errors: EnvelopeError[]
  hitl?: EnvelopeHitl
  trace?: EnvelopeTrace[]
}
