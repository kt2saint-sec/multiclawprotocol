import { useState, useEffect } from 'react'
import type { AgentManifest } from '../../types/agent'

interface SoulEditorProps {
  manifest: AgentManifest
  onUpdate?: (manifest: AgentManifest) => void
}

export function SoulEditor({ manifest, onUpdate }: SoulEditorProps) {
  const [role, setRole] = useState(manifest.soul.role)
  const [goal, setGoal] = useState(manifest.soul.goal)
  const [constraints, setConstraints] = useState(manifest.soul.constraints.join('\n'))

  useEffect(() => {
    setRole(manifest.soul.role)
    setGoal(manifest.soul.goal)
    setConstraints(manifest.soul.constraints.join('\n'))
  }, [manifest.id])

  const save = () => {
    onUpdate?.({
      ...manifest,
      soul: {
        ...manifest.soul,
        role,
        goal,
        constraints: constraints.split('\n').filter(Boolean),
      },
    })
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-caption text-gray-500 block mb-1">Role</label>
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          onBlur={save}
          className="w-full px-2 py-1.5 text-body-sm rounded border border-gray-200 dark:border-gray-700
            bg-surface-primary dark:bg-dark-surface-primary"
        />
      </div>
      <div>
        <label className="text-caption text-gray-500 block mb-1">Goal</label>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          onBlur={save}
          rows={3}
          className="w-full px-2 py-1.5 text-body-sm rounded border border-gray-200 dark:border-gray-700
            bg-surface-primary dark:bg-dark-surface-primary resize-y"
        />
      </div>
      <div>
        <label className="text-caption text-gray-500 block mb-1">Constraints (one per line)</label>
        <textarea
          value={constraints}
          onChange={(e) => setConstraints(e.target.value)}
          onBlur={save}
          rows={5}
          className="w-full px-2 py-1.5 text-caption font-mono rounded border border-gray-200 dark:border-gray-700
            bg-surface-primary dark:bg-dark-surface-primary resize-y"
        />
      </div>
    </div>
  )
}
