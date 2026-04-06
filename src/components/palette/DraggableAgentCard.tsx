import type { AgentManifest } from '../../types/agent'

const TEAM_COLORS: Record<string, string> = {
  blue: '#4A90D9', green: '#50C878', amber: '#FFB347',
  purple: '#9B59B6', red: '#EF4444', gray: '#6B7280',
}

interface DraggableAgentCardProps {
  manifest: AgentManifest
}

export function DraggableAgentCard({ manifest }: DraggableAgentCardProps) {
  const borderColor = TEAM_COLORS[manifest.display.color_class] || manifest.display.color_hex || '#6B7280'

  const onDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData('application/anvilbus-agent', JSON.stringify(manifest))
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-center gap-2 px-3 py-2 rounded-md cursor-grab active:cursor-grabbing
        hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      style={{ borderLeft: `3px solid ${borderColor}` }}
    >
      <div className="flex-1 min-w-0">
        <div className="text-body-sm font-medium text-surface-accent dark:text-gray-200 truncate">
          {manifest.display.name}
        </div>
        <div className="text-caption text-gray-400 truncate">
          {manifest.schemas.payload_type}
        </div>
      </div>
      <span className="text-caption text-gray-500 truncate max-w-[80px]">
        {manifest.model.preferred.model_id.split('/').pop()}
      </span>
    </div>
  )
}
