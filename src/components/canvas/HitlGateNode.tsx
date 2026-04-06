import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'

interface HitlGateData {
  label: string
  status: 'waiting' | 'approved' | 'rejected' | 'idle'
}

function HitlGateComponent({ data }: NodeProps & { data: HitlGateData }) {
  const statusStyle = {
    idle: 'border-gray-400 bg-gray-50 dark:bg-gray-800',
    waiting: 'border-status-paused bg-yellow-50 dark:bg-yellow-900/20 animate-pulse-slow',
    approved: 'border-status-success bg-green-50 dark:bg-green-900/20',
    rejected: 'border-status-error bg-red-50 dark:bg-red-900/20',
  }

  return (
    <div className={`w-[200px] rounded-node border-2 ${statusStyle[data.status]} p-3 text-center`}>
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-gray-400" />
      <div className="text-caption text-gray-500 mb-1">HUMAN GATE</div>
      <div className="text-body-sm font-semibold text-surface-accent dark:text-gray-100">{data.label}</div>
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-gray-400" />
    </div>
  )
}

export const HitlGateNode = memo(HitlGateComponent)
export type { HitlGateData }
