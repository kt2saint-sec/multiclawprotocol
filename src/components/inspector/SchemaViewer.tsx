import type { AgentManifest } from '../../types/agent'

interface SchemaViewerProps {
  manifest: AgentManifest
}

export function SchemaViewer({ manifest }: SchemaViewerProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-caption text-gray-500 block mb-1">Payload Type</label>
        <span className="text-body-sm font-mono text-agent-ops">{manifest.schemas.payload_type}</span>
      </div>
      <div>
        <label className="text-caption text-gray-500 block mb-1">Input Schema</label>
        <pre className="text-caption font-mono bg-gray-50 dark:bg-gray-900 rounded p-2 overflow-x-auto">
          {JSON.stringify(manifest.schemas.input, null, 2)}
        </pre>
      </div>
      <div>
        <label className="text-caption text-gray-500 block mb-1">Output Schema</label>
        <pre className="text-caption font-mono bg-gray-50 dark:bg-gray-900 rounded p-2 overflow-x-auto">
          {JSON.stringify(manifest.schemas.output, null, 2)}
        </pre>
      </div>
    </div>
  )
}
