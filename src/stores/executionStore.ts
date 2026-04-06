import { create } from 'zustand'

export type RunStatus = 'idle' | 'pending' | 'validating' | 'running' | 'paused' | 'completed' | 'error'
export type NodeStatus = 'idle' | 'init' | 'validate' | 'execute' | 'collect' | 'pass' | 'complete' | 'error'

export interface NodeRunState {
  nodeId: string
  status: NodeStatus
  startedAt: string | null
  completedAt: string | null
  costUsd: number
  tokensUsed: number
  errorMessage: string | null
}

export interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  nodeId: string | null
  message: string
}

export interface HitlRequest {
  nodeId: string
  evidence: Record<string, unknown>
  confidence: number
  costSoFar: number
  requestedAt: string
}

export interface ExecutionState {
  runId: string | null
  status: RunStatus
  nodeStates: Record<string, NodeRunState>
  totalCostUsd: number
  budgetReservedUsd: number
  logs: LogEntry[]
  hitlRequest: HitlRequest | null
  startedAt: string | null
  completedAt: string | null
  errorMessage: string | null

  // Actions
  startRun: (runId: string) => void
  updateNodeState: (nodeId: string, state: Partial<NodeRunState>) => void
  updateCost: (delta: number) => void
  addLog: (entry: Omit<LogEntry, 'timestamp'>) => void
  setHitlRequest: (request: HitlRequest | null) => void
  setStatus: (status: RunStatus) => void
  pauseRun: () => void
  resumeRun: () => void
  cancelRun: () => void
  completeRun: () => void
  reset: () => void
}

const initialState = {
  runId: null as string | null,
  status: 'idle' as RunStatus,
  nodeStates: {} as Record<string, NodeRunState>,
  totalCostUsd: 0,
  budgetReservedUsd: 0,
  logs: [] as LogEntry[],
  hitlRequest: null as HitlRequest | null,
  startedAt: null as string | null,
  completedAt: null as string | null,
  errorMessage: null as string | null,
}

export const useExecutionStore = create<ExecutionState>((set) => ({
  ...initialState,

  startRun: (runId) =>
    set({
      runId,
      status: 'running',
      startedAt: new Date().toISOString(),
      nodeStates: {},
      totalCostUsd: 0,
      budgetReservedUsd: 0,
      logs: [],
      hitlRequest: null,
      completedAt: null,
      errorMessage: null,
    }),

  updateNodeState: (nodeId, state) =>
    set((prev) => ({
      nodeStates: {
        ...prev.nodeStates,
        [nodeId]: {
          nodeId,
          status: 'idle',
          startedAt: null,
          completedAt: null,
          costUsd: 0,
          tokensUsed: 0,
          errorMessage: null,
          ...prev.nodeStates[nodeId],
          ...state,
        },
      },
    })),

  updateCost: (delta) =>
    set((state) => ({ totalCostUsd: state.totalCostUsd + delta })),

  addLog: (entry) =>
    set((state) => ({
      logs: [
        ...state.logs,
        { ...entry, timestamp: new Date().toISOString() },
      ],
    })),

  setHitlRequest: (request) => set({ hitlRequest: request }),

  setStatus: (status) => set({ status }),

  pauseRun: () => set({ status: 'paused' }),

  resumeRun: () => set({ status: 'running' }),

  cancelRun: () =>
    set({ status: 'idle', completedAt: new Date().toISOString() }),

  completeRun: () =>
    set({ status: 'completed', completedAt: new Date().toISOString() }),

  reset: () => set(initialState),
}))
