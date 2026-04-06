import type { AgentManifest } from '../../types/agent'

interface AgentConfigFormProps {
  manifest: AgentManifest
  onUpdate?: (manifest: AgentManifest) => void
}

export function AgentConfigForm({ manifest, onUpdate }: AgentConfigFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-caption text-gray-500 block mb-1">Model</label>
        <select
          className="w-full px-2 py-1.5 text-body-sm rounded border border-gray-200 dark:border-gray-700
            bg-surface-primary dark:bg-dark-surface-primary"
          value={manifest.model.preferred.model_id}
          onChange={(e) => onUpdate?.({
            ...manifest,
            model: { ...manifest.model, preferred: { ...manifest.model.preferred, model_id: e.target.value } }
          })}
        >
          <option value={manifest.model.preferred.model_id}>{manifest.model.preferred.model_id}</option>
          {manifest.model.fallback_chain.map(f => (
            <option key={f.model_id} value={f.model_id}>{f.model_id}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-caption text-gray-500 block mb-1">Temperature</label>
        <input
          type="range" min="0" max="1" step="0.1"
          value={manifest.model.preferred.temperature}
          onChange={(e) => onUpdate?.({
            ...manifest,
            model: { ...manifest.model, preferred: { ...manifest.model.preferred, temperature: parseFloat(e.target.value) } }
          })}
          className="w-full"
        />
        <span className="text-caption text-gray-400">{manifest.model.preferred.temperature}</span>
      </div>

      <div>
        <label className="text-caption text-gray-500 block mb-1">Tools</label>
        <div className="space-y-1">
          {manifest.tools.map(tool => (
            <label key={tool.id} className="flex items-center gap-2 text-body-sm">
              <input
                type="checkbox"
                checked={tool.enabled}
                onChange={() => onUpdate?.({
                  ...manifest,
                  tools: manifest.tools.map(t =>
                    t.id === tool.id ? { ...t, enabled: !t.enabled } : t
                  )
                })}
                className="rounded"
              />
              <span className="text-gray-700 dark:text-gray-300">{tool.id}</span>
              <span className="text-caption text-gray-400">({tool.type})</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="text-caption text-gray-500 block mb-1">Isolation</label>
        <span className="text-body-sm text-gray-700 dark:text-gray-300">{manifest.execution.isolation}</span>
      </div>
    </div>
  )
}
