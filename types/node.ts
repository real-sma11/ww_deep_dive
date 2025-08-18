export interface Position3D {
  x: number
  y: number
  z: number
}

export interface Node3D {
  id: string
  name: string
  position: Position3D // This is now relative to parent
  angle: number
  radius: number
  level: number
  parentId?: string
  children?: Node3D[]
  expanded: boolean
  color: string
  glowColor?: string // Add glow color property
  metalness?: number // Add metalness property
  roughness?: number // Add roughness property
  description?: string
  details?: string[]
}

export interface NetworkState {
  centerNode: Node3D
  nodes: Node3D[]
  focusedNodeId: string
  isZoomedIn: boolean
  breadcrumbs: { id: string; name: string }[]
}

// Helper function to calculate absolute position from relative position and parent
export function calculateAbsolutePosition(node: Node3D, parentAbsolutePosition: Position3D): Position3D {
  return {
    x: parentAbsolutePosition.x + node.position.x,
    y: parentAbsolutePosition.y + node.position.y,
    z: parentAbsolutePosition.z + node.position.z,
  }
}

// Helper function to calculate relative position from absolute positions
export function calculateRelativePosition(
  nodeAbsolutePosition: Position3D,
  parentAbsolutePosition: Position3D,
): Position3D {
  return {
    x: nodeAbsolutePosition.x - parentAbsolutePosition.x,
    y: nodeAbsolutePosition.y - parentAbsolutePosition.y,
    z: nodeAbsolutePosition.z - parentAbsolutePosition.z,
  }
}
