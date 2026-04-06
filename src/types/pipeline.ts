export interface PipelineParam {
  name: string
  type: string
  required?: boolean
  default?: unknown
  description?: string
}

export interface PipelineNodeInput {
  name: string
  type: string
  source: string
}

export interface PipelineNodeOutput {
  name: string
  type: string
  payload_type: string
}

export interface PipelineNode {
  id: string
  name: string
  agent_ref: string
  overrides?: Record<string, unknown>
  inputs: PipelineNodeInput[]
  outputs: PipelineNodeOutput[]
  budget?: { max_cost_usd: number }
  timeout_seconds?: number
  condition?: string
}

export interface PipelineEdge {
  from: string
  to: string
  condition?: string
}

export interface PipelineBudget {
  max_cost_usd: number
  warn_at_usd: number
  cost_tracking?: boolean
}

export interface PipelineExecution {
  mode: 'sequential' | 'parallel' | 'dag'
  max_parallel_nodes: number
  timeout_seconds: number
  on_budget_exceeded?: 'pause_and_notify' | 'fallback' | 'terminate'
  checkpointing: { enabled: boolean; storage: string }
}

export interface PipelineDefinition {
  id: string
  name: string
  version: string
  description: string
  author?: string
  tags?: string[]
  created?: string
  params: PipelineParam[]
  budget: PipelineBudget
  nodes: PipelineNode[]
  edges: PipelineEdge[]
  execution: PipelineExecution
}
