import { useCallback } from 'react'
import {
  ReactFlow, Background, MiniMap, Controls, Panel,
  type OnConnect, type Connection,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useFlowStore } from '../../stores/flowStore'
import { AgentNode } from './AgentNode'
import { HitlGateNode } from './HitlGateNode'
import { TypedEdge } from './TypedEdge'
import { useConnectionValidator } from '../../hooks/useConnectionValidator'
import { useAgentDragDrop } from '../../hooks/useAgentDragDrop'

// CRITICAL: define outside component to prevent remounting
const nodeTypes = { agent: AgentNode, hitlGate: HitlGateNode }
const edgeTypes = { typed: TypedEdge }

export function PipelineCanvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useFlowStore()
  const isValidConnection = useConnectionValidator()
  const { onDragOver, onDrop } = useAgentDragDrop()

  const handleConnect: OnConnect = useCallback((connection: Connection) => {
    onConnect({
      ...connection,
      type: 'typed',
      data: { payloadType: 'signal', animated: false },
    } as Connection)
  }, [onConnect])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={handleConnect}
      isValidConnection={isValidConnection}
      onDragOver={onDragOver}
      onDrop={onDrop}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      defaultEdgeOptions={{ type: 'typed' }}
      fitView
      className="bg-surface-primary dark:bg-dark-surface-primary"
    >
      <Background variant="dots" gap={20} size={1} className="!bg-transparent" color="#33333320" />
      <MiniMap
        className="!bg-surface-secondary dark:!bg-dark-surface-secondary !border-gray-200 dark:!border-gray-700"
        maskColor="rgba(0,0,0,0.1)"
      />
      <Controls className="!bg-surface-primary dark:!bg-dark-surface-primary !border-gray-200 dark:!border-gray-700 !shadow-node" />
      <Panel position="top-right">
        <div className="flex gap-2">
          <button className="btn-cart text-caption px-3 py-1.5">Run</button>
          <button className="px-3 py-1.5 text-caption rounded-pill border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800">
            Save
          </button>
        </div>
      </Panel>
    </ReactFlow>
  )
}
