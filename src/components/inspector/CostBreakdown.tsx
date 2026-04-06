interface CostEntry {
  nodeId: string
  agentId: string
  cost: number
  tokens: { input: number; output: number }
}

interface CostBreakdownProps {
  entries: CostEntry[]
  budget: number
}

export function CostBreakdown({ entries, budget }: CostBreakdownProps) {
  const total = entries.reduce((sum, e) => sum + e.cost, 0)
  const pct = Math.round((total / budget) * 100)

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-body-sm">
        <span className="text-gray-500">Total Cost</span>
        <span className={total > budget ? 'text-status-error font-bold' : 'text-status-success'}>
          ${total.toFixed(4)} / ${budget.toFixed(2)}
        </span>
      </div>
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(pct, 100)}%`,
            background: pct > 90 ? '#EF4444' : pct > 70 ? '#F59E0B' : '#10B981',
          }}
        />
      </div>
      {entries.map(e => (
        <div key={e.nodeId} className="flex justify-between text-caption text-gray-400">
          <span>{e.agentId}</span>
          <span>${e.cost.toFixed(4)}</span>
        </div>
      ))}
    </div>
  )
}
