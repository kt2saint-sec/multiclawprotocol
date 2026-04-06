import { create } from 'zustand'
import type { AgentManifest } from '../types/agent'

export interface AgentRegistryState {
  agents: Record<string, AgentManifest>
  isLoading: boolean
  loadError: string | null
  lastLoadedAt: string | null

  // Actions
  registerAgent: (manifest: AgentManifest) => void
  registerAgents: (manifests: AgentManifest[]) => void
  unregisterAgent: (id: string) => void
  getAgent: (id: string) => AgentManifest | undefined
  getAgentsByTeam: (team: string) => AgentManifest[]
  setLoading: (loading: boolean) => void
  setLoadError: (error: string | null) => void
  reset: () => void
}

const initialState = {
  agents: {} as Record<string, AgentManifest>,
  isLoading: false,
  loadError: null as string | null,
  lastLoadedAt: null as string | null,
}

export const useAgentRegistryStore = create<AgentRegistryState>((set, get) => ({
  ...initialState,

  registerAgent: (manifest) =>
    set((state) => ({
      agents: { ...state.agents, [manifest.id]: manifest },
      lastLoadedAt: new Date().toISOString(),
    })),

  registerAgents: (manifests) =>
    set((state) => {
      const next = { ...state.agents }
      for (const m of manifests) next[m.id] = m
      return { agents: next, lastLoadedAt: new Date().toISOString() }
    }),

  unregisterAgent: (id) =>
    set((state) => {
      const next = { ...state.agents }
      delete next[id]
      return { agents: next }
    }),

  getAgent: (id) => get().agents[id],

  getAgentsByTeam: (team) =>
    Object.values(get().agents).filter((a) =>
      a.display.tags?.includes(team)
    ),

  setLoading: (loading) => set({ isLoading: loading }),

  setLoadError: (error) => set({ loadError: error, isLoading: false }),

  reset: () => set(initialState),
}))
