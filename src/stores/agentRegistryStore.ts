import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AgentManifest } from "../types/agent";
import { DEMO_AGENTS } from "../data/demo-agents";

export interface AgentRegistryState {
  agents: Record<string, AgentManifest>;
  isLoading: boolean;
  loadError: string | null;
  lastLoadedAt: string | null;
  initialized: boolean;

  // Actions
  registerAgent: (manifest: AgentManifest) => void;
  registerAgents: (manifests: AgentManifest[]) => void;
  unregisterAgent: (id: string) => void;
  getAgent: (id: string) => AgentManifest | undefined;
  getAgentsByTeam: (team: string) => AgentManifest[];
  setLoading: (loading: boolean) => void;
  setLoadError: (error: string | null) => void;
  reset: () => void;
}

export const useAgentRegistryStore = create<AgentRegistryState>()(
  persist(
    (set, get) => ({
      agents: {} as Record<string, AgentManifest>,
      isLoading: false,
      loadError: null as string | null,
      lastLoadedAt: null as string | null,
      initialized: false,

      registerAgent: (manifest) =>
        set((state) => ({
          agents: { ...state.agents, [manifest.id]: manifest },
          lastLoadedAt: new Date().toISOString(),
        })),

      registerAgents: (manifests) =>
        set((state) => {
          const next = { ...state.agents };
          for (const m of manifests) next[m.id] = m;
          return {
            agents: next,
            lastLoadedAt: new Date().toISOString(),
            initialized: true,
          };
        }),

      unregisterAgent: (id) =>
        set((state) => {
          const next = { ...state.agents };
          delete next[id];
          return { agents: next };
        }),

      getAgent: (id) => get().agents[id],

      getAgentsByTeam: (team) =>
        Object.values(get().agents).filter((a) =>
          a.display.tags?.includes(team),
        ),

      setLoading: (loading) => set({ isLoading: loading }),

      setLoadError: (error) => set({ loadError: error, isLoading: false }),

      reset: () =>
        set({
          agents: {},
          isLoading: false,
          loadError: null,
          lastLoadedAt: null,
          initialized: false,
        }),
    }),
    {
      name: "anvilbus-agent-registry",
      partialize: (state) => ({
        agents: state.agents,
        lastLoadedAt: state.lastLoadedAt,
        initialized: state.initialized,
      }),
      onRehydrate: (_state, options) => {
        // After rehydration, auto-install base agents if not initialized
        return (rehydrated) => {
          if (rehydrated && !rehydrated.initialized) {
            rehydrated.registerAgents(DEMO_AGENTS);
          }
        };
      },
    },
  ),
);
