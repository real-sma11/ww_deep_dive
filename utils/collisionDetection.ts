import type { Position3D, Node3D } from "../types/node"

export function distance3D(pos1: Position3D, pos2: Position3D): number {
  return Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2) + Math.pow(pos1.z - pos2.z, 2))
}

// Calculate distance from center (origin)
function distanceFromCenter(pos: Position3D): number {
  return Math.sqrt(pos.x ** 2 + pos.y ** 2 + pos.z ** 2)
}

// Helper function to identify which branch family a node belongs to
function getBranchFamily(nodeId: string, nodes: Node3D[], centerNode: Node3D): string {
  if (nodeId === centerNode.id) return "center"

  // Check if it's a top-level node
  const topLevelNode = nodes.find((n) => n.id === nodeId)
  if (topLevelNode) return nodeId

  // Find which top-level branch this node belongs to
  for (const topNode of nodes) {
    const searchInBranch = (node: Node3D): boolean => {
      if (node.id === nodeId) return true
      if (node.children) {
        return node.children.some((child) => searchInBranch(child))
      }
      return false
    }

    if (searchInBranch(topNode)) {
      return topNode.id
    }
  }

  return "center" // fallback
}

// Helper function to check if two nodes are in the same branch family
function areInSameFamily(nodeId1: string, nodeId2: string, nodes: Node3D[], centerNode: Node3D): boolean {
  const family1 = getBranchFamily(nodeId1, nodes, centerNode)
  const family2 = getBranchFamily(nodeId2, nodes, centerNode)
  return family1 === family2
}

// Enhanced line intersection detection with buffer zone
function doLinesIntersect(
  line1Start: { x: number; y: number },
  line1End: { x: number; y: number },
  line2Start: { x: number; y: number },
  line2End: { x: number; y: number },
  buffer = 0.3, // Add buffer zone around lines
): boolean {
  const det =
    (line1End.x - line1Start.x) * (line2End.y - line2Start.y) -
    (line2End.x - line2Start.x) * (line1End.y - line1Start.y)

  if (Math.abs(det) < 0.0001) {
    return false // Lines are parallel or nearly parallel
  }

  const lambda =
    ((line2End.y - line2Start.y) * (line2End.x - line1Start.x) +
      (line2Start.x - line2End.x) * (line2End.y - line1Start.y)) /
    det
  const gamma =
    ((line1Start.y - line1End.y) * (line2End.x - line1Start.x) +
      (line1End.x - line1Start.x) * (line2End.y - line1Start.y)) /
    det

  // Check intersection with buffer zone
  const bufferMargin =
    buffer /
    Math.max(
      Math.sqrt((line1End.x - line1Start.x) ** 2 + (line1End.y - line1Start.y) ** 2),
      Math.sqrt((line2End.x - line2Start.x) ** 2 + (line2End.y - line2Start.y) ** 2),
    )

  return lambda > -bufferMargin && lambda < 1 + bufferMargin && gamma > -bufferMargin && gamma < 1 + bufferMargin
}

// Function to collect all existing connection lines with metadata
function collectExistingLines(
  nodes: Node3D[],
  centerNode: Node3D,
): Array<{
  start: Position3D
  end: Position3D
  startNodeId: string
  endNodeId: string
}> {
  const lines: Array<{ start: Position3D; end: Position3D; startNodeId: string; endNodeId: string }> = []

  function collectFromNode(node: Node3D, parent?: Node3D) {
    if (parent) {
      lines.push({
        start: parent.position,
        end: node.position,
        startNodeId: parent.id,
        endNodeId: node.id,
      })
    }

    if (node.children && node.expanded) {
      node.children.forEach((child) => collectFromNode(child, node))
    }
  }

  // Collect lines from center to top-level nodes
  nodes.forEach((node) => {
    lines.push({
      start: centerNode.position,
      end: node.position,
      startNodeId: centerNode.id,
      endNodeId: node.id,
    })
    if (node.children && node.expanded) {
      node.children.forEach((child) => collectFromNode(child, node))
    }
  })

  return lines
}

// Enhanced intersection checking with family awareness
function wouldLineIntersect(
  proposedStart: Position3D,
  proposedEnd: Position3D,
  existingLines: Array<{ start: Position3D; end: Position3D; startNodeId?: string; endNodeId?: string }>,
  proposedStartNodeId?: string,
  proposedEndNodeId?: string,
): boolean {
  // Project to 2D for intersection testing (using x,y coordinates)
  const proposed2D = {
    start: { x: proposedStart.x, y: proposedStart.y },
    end: { x: proposedEnd.x, y: proposedEnd.y },
  }

  return existingLines.some((line) => {
    // Skip checking against lines that share nodes (parent-child relationships)
    if (proposedStartNodeId && proposedEndNodeId) {
      if (
        line.startNodeId === proposedStartNodeId ||
        line.startNodeId === proposedEndNodeId ||
        line.endNodeId === proposedStartNodeId ||
        line.endNodeId === proposedEndNodeId
      ) {
        return false // Skip connected lines
      }
    }

    const existing2D = {
      start: { x: line.start.x, y: line.start.y },
      end: { x: line.end.x, y: line.end.y },
    }

    return doLinesIntersect(proposed2D.start, proposed2D.end, existing2D.start, existing2D.end, 0.5)
  })
}

export function getAllNodePositions(nodes: Node3D[], centerNode: Node3D): Position3D[] {
  const positions: Position3D[] = [centerNode.position]

  function collectPositions(nodeList: Node3D[]) {
    nodeList.forEach((node) => {
      positions.push(node.position)
      if (node.children && node.expanded) {
        collectPositions(node.children)
      }
    })
  }

  collectPositions(nodes)
  return positions
}

// Enhanced function to enforce hierarchical distance constraint
function enforceHierarchicalDistance(
  candidatePos: Position3D,
  parentPos: Position3D,
  centerPos: Position3D = { x: 0, y: 0, z: 0 },
  minGenerationGap = 0.8, // Minimum additional distance each generation should have
): Position3D {
  const parentDistanceFromCenter = distanceFromCenter(parentPos)
  const candidateDistanceFromCenter = distanceFromCenter(candidatePos)

  // If candidate is already far enough, return as-is
  if (candidateDistanceFromCenter >= parentDistanceFromCenter + minGenerationGap) {
    return candidatePos
  }

  // Calculate the required minimum distance from center
  const requiredDistanceFromCenter = parentDistanceFromCenter + minGenerationGap

  // Calculate direction from center to candidate
  const directionFromCenter = {
    x: candidatePos.x,
    y: candidatePos.y,
    z: candidatePos.z,
  }

  const currentDistance = Math.sqrt(
    directionFromCenter.x ** 2 + directionFromCenter.y ** 2 + directionFromCenter.z ** 2,
  )

  // If candidate is at center, use direction from parent
  if (currentDistance < 0.001) {
    directionFromCenter.x = candidatePos.x - parentPos.x
    directionFromCenter.y = candidatePos.y - parentPos.y
    directionFromCenter.z = candidatePos.z - parentPos.z
    const parentDirection = Math.sqrt(
      directionFromCenter.x ** 2 + directionFromCenter.y ** 2 + directionFromCenter.z ** 2,
    )
    if (parentDirection > 0.001) {
      directionFromCenter.x /= parentDirection
      directionFromCenter.y /= parentDirection
      directionFromCenter.z /= parentDirection
    } else {
      // Fallback to a default direction
      directionFromCenter.x = 1
      directionFromCenter.y = 0
      directionFromCenter.z = 0
    }
  } else {
    // Normalize the direction
    directionFromCenter.x /= currentDistance
    directionFromCenter.y /= currentDistance
    directionFromCenter.z /= currentDistance
  }

  // Position the candidate at the required distance from center
  return {
    x: directionFromCenter.x * requiredDistanceFromCenter,
    y: directionFromCenter.y * requiredDistanceFromCenter,
    z: directionFromCenter.z * requiredDistanceFromCenter,
  }
}

export function findSafePosition(
  parentPos: Position3D,
  preferredPos: Position3D,
  existingPositions: Position3D[],
  existingLines: Array<{ start: Position3D; end: Position3D; startNodeId?: string; endNodeId?: string }> = [],
  minDistance = 1.4,
  currentNodeId?: string,
  parentNodeId?: string,
  centerPos: Position3D = { x: 0, y: 0, z: 0 },
): Position3D {
  // Glow radius consideration
  const glowBuffer = 0.6
  const effectiveMinDistance = minDistance + glowBuffer

  // First, enforce hierarchical distance constraint
  const hierarchicalPos = enforceHierarchicalDistance(preferredPos, parentPos, centerPos, 0.8)

  // Check if hierarchical position is safe
  const noCollision = existingPositions.every((pos) => distance3D(hierarchicalPos, pos) >= effectiveMinDistance)
  const noIntersection = !wouldLineIntersect(parentPos, hierarchicalPos, existingLines, parentNodeId, currentNodeId)

  if (noCollision && noIntersection) {
    return hierarchicalPos
  }

  // Try different angles around the parent while maintaining hierarchical distance
  const parentDistanceFromCenter = distanceFromCenter(parentPos)
  const minChildDistanceFromCenter = parentDistanceFromCenter + 0.8
  const baseDistance = Math.max(distance3D(parentPos, hierarchicalPos), effectiveMinDistance)
  const attempts = 32

  for (let i = 0; i < attempts; i++) {
    const angle = (i * Math.PI * 2) / attempts
    let testPos: Position3D = {
      x: parentPos.x + Math.cos(angle) * baseDistance,
      y: parentPos.y + Math.sin(angle) * baseDistance,
      z: hierarchicalPos.z + (Math.random() - 0.5) * 0.2,
    }

    // Enforce hierarchical distance constraint on test position
    testPos = enforceHierarchicalDistance(testPos, parentPos, centerPos, 0.8)

    const testNoCollision = existingPositions.every((pos) => distance3D(testPos, pos) >= effectiveMinDistance)
    const testNoIntersection = !wouldLineIntersect(parentPos, testPos, existingLines, parentNodeId, currentNodeId)

    if (testNoCollision && testNoIntersection) {
      return testPos
    }
  }

  // If still no safe position, try with increased distance while maintaining hierarchy
  for (let distance = baseDistance + 0.5; distance < baseDistance + 4.0; distance += 0.3) {
    for (let i = 0; i < attempts; i++) {
      const angle = (i * Math.PI * 2) / attempts
      let testPos: Position3D = {
        x: parentPos.x + Math.cos(angle) * distance,
        y: parentPos.y + Math.sin(angle) * distance,
        z: hierarchicalPos.z + (Math.random() - 0.5) * 0.2,
      }

      // Enforce hierarchical distance constraint
      testPos = enforceHierarchicalDistance(testPos, parentPos, centerPos, 0.8)

      const testNoCollision = existingPositions.every((pos) => distance3D(testPos, pos) >= effectiveMinDistance)
      const testNoIntersection = !wouldLineIntersect(parentPos, testPos, existingLines, parentNodeId, currentNodeId)

      if (testNoCollision && testNoIntersection) {
        return testPos
      }
    }
  }

  // Fallback - ensure hierarchical constraint is maintained
  const direction = {
    x: hierarchicalPos.x - parentPos.x,
    y: hierarchicalPos.y - parentPos.y,
    z: hierarchicalPos.z - parentPos.z,
  }
  const length = Math.sqrt(direction.x ** 2 + direction.y ** 2 + direction.z ** 2)
  const normalized = {
    x: direction.x / length || 1,
    y: direction.y / length || 0,
    z: direction.z / length || 0,
  }

  const fallbackPos = {
    x: parentPos.x + normalized.x * (baseDistance + effectiveMinDistance * 2),
    y: parentPos.y + normalized.y * (baseDistance + effectiveMinDistance * 2),
    z: parentPos.z + normalized.z * (baseDistance + effectiveMinDistance * 2),
  }

  // Ensure fallback also respects hierarchical constraint
  return enforceHierarchicalDistance(fallbackPos, parentPos, centerPos, 0.8)
}

// Enhanced child arrangement with hierarchical distance constraint
export function arrangeChildrenAroundParent(
  parentPos: Position3D,
  children: Node3D[],
  existingPositions: Position3D[],
  existingLines: Array<{ start: Position3D; end: Position3D; startNodeId?: string; endNodeId?: string }> = [],
  baseRadius = 1.9,
  minDistance = 1.4,
  parentNodeId?: string,
  centerPos: Position3D = { x: 0, y: 0, z: 0 },
): Position3D[] {
  const childPositions: Position3D[] = []
  const numChildren = children.length

  if (numChildren === 0) return childPositions

  // Glow buffer to prevent overlap
  const glowBuffer = 0.6
  const effectiveMinDistance = minDistance + glowBuffer

  // Calculate minimum radius based on hierarchical constraint
  const parentDistanceFromCenter = distanceFromCenter(parentPos)
  const minChildDistanceFromCenter = parentDistanceFromCenter + 0.8

  // Ensure base radius respects hierarchical constraint
  const hierarchicalRadius = Math.max(baseRadius, minChildDistanceFromCenter - distanceFromCenter(parentPos))
  const radius = Math.max(hierarchicalRadius, (numChildren * effectiveMinDistance) / (2.2 * Math.PI))

  for (let i = 0; i < numChildren; i++) {
    let bestPosition: Position3D | null = null
    let bestScore = Number.POSITIVE_INFINITY

    // Try more angle variations for better intersection avoidance
    for (let angleAttempt = 0; angleAttempt < 16; angleAttempt++) {
      const baseAngle = (i * 2 * Math.PI) / numChildren
      const angleVariation = (angleAttempt * Math.PI) / 8
      const finalAngle = baseAngle + angleVariation

      const radiusVariation = (Math.random() - 0.5) * 0.2
      const finalRadius = radius + radiusVariation

      let candidatePos: Position3D = {
        x: parentPos.x + Math.cos(finalAngle) * finalRadius,
        y: parentPos.y + Math.sin(finalAngle) * finalRadius,
        z: parentPos.z + (Math.random() - 0.5) * 0.2,
      }

      // Enforce hierarchical distance constraint
      candidatePos = enforceHierarchicalDistance(candidatePos, parentPos, centerPos, 0.8)

      // Check collision
      const hasCollision =
        existingPositions.some((pos) => distance3D(candidatePos, pos) < effectiveMinDistance) ||
        childPositions.some((pos) => distance3D(candidatePos, pos) < effectiveMinDistance)

      // Check intersection with enhanced detection
      const hasIntersection = wouldLineIntersect(parentPos, candidatePos, existingLines, parentNodeId, children[i].id)

      let score = 0
      if (hasCollision) score += 1000
      if (hasIntersection) score += 2000 // Higher penalty for intersections
      score += Math.abs(angleVariation) * 10

      if (score < bestScore) {
        bestScore = score
        bestPosition = candidatePos
      }

      // Accept good positions early
      if (score === Math.abs(angleVariation) * 10) {
        break
      }
    }

    if (bestPosition) {
      const safePos = findSafePosition(
        parentPos,
        bestPosition,
        [...existingPositions, ...childPositions],
        existingLines,
        minDistance,
        children[i].id,
        parentNodeId,
        centerPos,
      )
      childPositions.push(safePos)
    }
  }

  return childPositions
}

// Enhanced repositioning function with hierarchical distance constraint
export function repositionNodesWithCollisionDetection(
  nodes: Node3D[],
  centerNode: Node3D,
  existingPositions: Position3D[] = [],
): void {
  const allPositions = [...existingPositions, centerNode.position]
  const allLines: Array<{ start: Position3D; end: Position3D; startNodeId: string; endNodeId: string }> = []
  const centerPos = centerNode.position

  function repositionNodeAndChildren(node: Node3D, parentPos: Position3D, level = 0, parentNodeId?: string) {
    // Spacing with intersection consideration and hierarchical constraint
    const isTopLevel = level === 0
    const minDist = isTopLevel ? 2.8 : 1.4

    const safePosition = findSafePosition(
      parentPos,
      node.position,
      allPositions,
      allLines,
      minDist,
      node.id,
      parentNodeId,
      centerPos,
    )
    node.position = safePosition
    allPositions.push(safePosition)
    allLines.push({
      start: parentPos,
      end: safePosition,
      startNodeId: parentNodeId || centerNode.id,
      endNodeId: node.id,
    })

    if (node.children && node.expanded && node.children.length > 0) {
      const childPositions = arrangeChildrenAroundParent(
        node.position,
        node.children,
        allPositions,
        allLines,
        1.7 + level * 0.2,
        1.3 + level * 0.15,
        node.id,
        centerPos,
      )

      node.children.forEach((child, index) => {
        child.position = childPositions[index]
        allPositions.push(childPositions[index])
        allLines.push({
          start: node.position,
          end: childPositions[index],
          startNodeId: node.id,
          endNodeId: child.id,
        })
        repositionNodeAndChildren(child, child.position, level + 1, node.id)
      })
    }
  }

  nodes.forEach((node) => {
    repositionNodeAndChildren(node, centerNode.position, 0, centerNode.id)
  })
}
