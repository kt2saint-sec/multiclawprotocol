import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PipelineDefinition } from '../types/pipeline'

export interface PipelineState {
  pipeline: PipelineDefinition | null
  isDirty: boolean
  lastSavedAt: string | null

  // Actions
  setPipeline: (pipeline: PipelineDefinition) => void
  updateMeta: (meta: Partial<Pick<PipelineDefinition, 'name' | 'description' | 'version'>>) => void
  updateBudget: (budget: PipelineDefinition['budget']) => void
  updateExecutionConfig: (config: PipelineDefinition['execution_config']) => void
  markSaved: () => void
  markDirty: () => void
  newPipeline: () => void
  reset: () => void
}

const defaultPipeline = (): PipelineDefinition => ({
  id: crypto.randomUUID(),
  name: 'Untitled Pipeline',
  version: '1.0.0',
  description: '',
  params: [],
  budget: {
    max_cost_usd: 2.0,
    warn_at_usd: 1.5,
  },
  nodes: [],
  edges: [],
  execution_config: {
    mode: 'directed_acyclic_graph',
    max_parallel_nodes: 2,
    timeout: 3600,
    checkpointing: true,
  },
})

export const usePipelineStore = create<PipelineState>()(
  persist(
    (set) => ({
      pipeline: null,
      isDirty: false,
      lastSavedAt: null,

      setPipeline: (pipeline) => set({ pipeline, isDirty: false }),

      updateMeta: (meta) =>
        set((state) => ({
          pipeline: state.pipeline ? { ...state.pipeline, ...meta } : null,
          isDirty: true,
        })),

      updateBudget: (budget) =>
        set((state) => ({
          pipeline: state.pipeline ? { ...state.pipeline, budget } : null,
          isDirty: true,
        })),

      updateExecutionConfig: (config) =>
        set((state) => ({
          pipeline: state.pipeline
            ? { ...state.pipeline, execution_config: config }
            : null,
          isDirty: true,
        })),

      markSaved: () =>
        set({ isDirty: false, lastSavedAt: new Date().toISOString() }),

      markDirty: () => set({ isDirty: true }),

      newPipeline: () =>
        set({ pipeline: defaultPipeline(), isDirty: false, lastSavedAt: null }),

      reset: () => set({ pipeline: null, isDirty: false, lastSavedAt: null }),
    }),
    {
      name: 'anvilbus-pipeline',
      partialize: (state) => ({ pipeline: state.pipeline, lastSavedAt: state.lastSavedAt }),
    }
  )
)
