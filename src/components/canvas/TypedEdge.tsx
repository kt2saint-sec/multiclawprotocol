import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react'

const PAYLOAD_COLORS: Record<string, string> = {
  briefing: '#6366F1',
  research_findings: '#3B82F6',
  design_spec: '#8B5CF6',
  code_submission: '#10B981',
  prove_it_verdict: '#F59E0B',
  compliance_review: '#EF4444',
  signal: '#EC4899',
  cost_report: '#52C41A',
  trend: '#3B82F6',
  advisory: '#9B59B6',
}

interface TypedEdgeData {
  payloadType?: string
  animated?: boolean
}

export function TypedEdge({
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  style = {}, markerEnd, data,
}: EdgeProps & { data?: TypedEdgeData }) {
  const [edgePath] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
  const color = PAYLOAD_COLORS[data?.payloadType || ''] || '#637088'
  const isAnimated = data?.animated ?? false

  return (
    <BaseEdge
      path={edgePath}
      markerEnd={markerEnd}
      style={{
        ...style,
        stroke: color,
        strokeWidth: 2,
        strokeDasharray: isAnimated ? '6 3' : undefined,
        animation: isAnimated ? 'flowDash 1.5s linear infinite' : undefined,
      }}
    />
  )
}
