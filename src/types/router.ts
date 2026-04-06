export interface ModelInfo {
  input_cost_per_token: number
  output_cost_per_token: number
  max_tokens: number
  supports_function_calling: boolean
  supports_vision?: boolean
  mode?: 'chat' | 'embedding'
}

export interface LiteLLMParams {
  model: string
  api_key?: string
  api_base?: string
  keep_alive?: string
  stream?: boolean
}

export interface ModelEntry {
  model_name: string
  litellm_params: LiteLLMParams
  model_info: ModelInfo
  order?: number
}

export interface RouterSettings {
  routing_strategy: 'simple-shuffle' | 'lowest-cost' | 'latency-optimized' | 'round-robin'
  fallbacks: Record<string, string[]>
  context_window_fallbacks?: Record<string, string[]>
  num_retries: number
  timeout: number
  allowed_fails?: number
  cooldown_time?: number
  model_group_alias?: Record<string, string>
  enable_pre_call_checks?: boolean
}

export interface ModelRouterConfig {
  model_list: ModelEntry[]
  router_settings: RouterSettings
  litellm_settings?: Record<string, unknown>
  general_settings?: Record<string, unknown>
}
