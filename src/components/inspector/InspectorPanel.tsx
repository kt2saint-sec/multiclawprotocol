import { useState } from 'react'
import { AgentConfigForm } from './AgentConfigForm'
import { SoulEditor } from './SoulEditor'
import { SchemaViewer } from './SchemaViewer'
import type { AgentManifest } from '../../types/agent'

interface InspectorPanelProps {
  selectedAgent: AgentManifest | null
  onUpdate?: (manifest: AgentManifest) => void
}

const TABS = ['Config', 'Soul', 'Schema', 'Logs'] as const
type Tab = typeof TABS[number]

export function InspectorPanel({ selectedAgent, onUpdate }: InspectorPanelProps) {
  const [tab, setTab] = useState<Tab>('Config')

  if (!selectedAgent) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4">
        <p className="text-body-sm">Select a node to inspect</p>
        <p className="text-caption mt-2">Click an agent on the canvas</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 px-2">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-caption font-medium transition-colors
              ${tab === t
                ? 'text-agent-ops border-b-2 border-agent-ops'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-3">
        {tab === 'Config' && <AgentConfigForm manifest={selectedAgent} onUpdate={onUpdate} />}
        {tab === 'Soul' && <SoulEditor manifest={selectedAgent} onUpdate={onUpdate} />}
        {tab === 'Schema' && <SchemaViewer manifest={selectedAgent} />}
        {tab === 'Logs' && (
          <div className="font-mono text-caption text-gray-500 bg-gray-50 dark:bg-gray-900 rounded p-3 h-full">
            <p className="text-gray-400">No logs yet — run the pipeline to see output</p>
          </div>
        )}
      </div>
    </div>
  )
}
