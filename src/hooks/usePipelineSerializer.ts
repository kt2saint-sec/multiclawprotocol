import { useCallback } from 'react'
import { useReactFlow } from '@xyflow/react'
import yaml from 'js-yaml'
import type { PipelineDefinition } from '../types/pipeline'

export function usePipelineSerializer() {
  const { getNodes, getEdges } = useReactFlow()

  const toYaml = useCallback((): string => {
    const nodes = getNodes()
    const edges = getEdges()

    const pipeline: PipelineDefinition = {
      id: `pln_${Date.now()}`,
      name: 'Untitled Pipeline',
      version: '1.0.0',
      description: '',
      params: [],
      budget: { max_cost_usd: 2.0, warn_at_usd: 1.5 },
      nodes: nodes.map(n => ({
        id: n.id,
        name: n.data?.manifest?.display?.name || n.id,
        agent_ref: `agents/${n.data?.manifest?.id || 'unknown'}`,
        inputs: [],
        outputs: [{ name: 'output', type: 'object', payload_type: n.data?.manifest?.schemas?.payload_type || 'signal' }],
      })),
      edges: edges.map(e => ({ from: e.source, to: e.target })),
      execution: {
        mode: 'dag',
        max_parallel_nodes: 2,
        timeout_seconds: 3600,
        checkpointing: { enabled: true, storage: './workspace/checkpoints/' },
      },
    }

    return yaml.dump({ pipeline }, { lineWidth: 120 })
  }, [getNodes, getEdges])

  const fromYaml = useCallback((content: string) => {
    const parsed = yaml.load(content) as { pipeline: PipelineDefinition }
    return parsed.pipeline
  }, [])

  return { toYaml, fromYaml }
}
