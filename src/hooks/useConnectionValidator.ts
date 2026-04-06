import { useCallback } from 'react'
import { useReactFlow, type IsValidConnection } from '@xyflow/react'

export function useConnectionValidator(): IsValidConnection {
  const { getNode } = useReactFlow()

  return useCallback<IsValidConnection>((connection) => {
    const sourceNode = getNode(connection.source || '')
    const targetNode = getNode(connection.target || '')
    if (!sourceNode || !targetNode) return false

    const sourceType = sourceNode.data?.outputPayloadType as string | undefined
    const targetAccepts = targetNode.data?.inputAcceptTypes as string[] | undefined

    if (!sourceType || !targetAccepts) return true // allow if untyped
    return targetAccepts.includes(sourceType)
  }, [getNode])
}
