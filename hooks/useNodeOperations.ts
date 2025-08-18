"use client"

import { useCallback } from "react"
import type { Node3D, Position3D } from "../types/node"
import { calculateAbsolutePosition } from "../types/node"

export function useNodeOperations() {
  const findNodeById = useCallback((nodeId: string, nodes: Node3D[], centerNode: Node3D): Node3D | null => {
    if (centerNode.id === nodeId) return centerNode

    const searchInNodes = (nodeList: Node3D[]): Node3D | null => {
      for (const node of nodeList) {
        if (node.id === nodeId) return node
        if (node.children) {
          const found = searchInNodes(node.children)
          if (found) return found
        }
      }
      return null
    }

    return searchInNodes(nodes)
  }, [])

  const buildBreadcrumbPath = useCallback(
    (targetNodeId: string, nodes: Node3D[], centerNode: Node3D): { id: string; name: string }[] => {
      const path: { id: string; name: string }[] = []

      const findPath = (nodeList: Node3D[], currentPath: { id: string; name: string }[]): boolean => {
        for (const node of nodeList) {
          const newPath = [...currentPath, { id: node.id, name: node.name }]

          if (node.id === targetNodeId) {
            path.push(...newPath)
            return true
          }

          if (node.children && findPath(node.children, newPath)) {
            return true
          }
        }
        return false
      }

      if (targetNodeId === centerNode.id) {
        return [{ id: centerNode.id, name: centerNode.name }]
      }

      path.push({ id: centerNode.id, name: centerNode.name })
      findPath(nodes, [])

      return path
    },
    [],
  )

  // Calculate absolute position for a node given its parent's absolute position
  const getAbsolutePosition = useCallback((node: Node3D, parentAbsolutePosition: Position3D): Position3D => {
    return calculateAbsolutePosition(node, parentAbsolutePosition)
  }, [])

  // Get the absolute position of a node by traversing up the hierarchy
  const getNodeAbsolutePosition = useCallback((nodeId: string, nodes: Node3D[], centerNode: Node3D): Position3D => {
    if (nodeId === centerNode.id) {
      return centerNode.relativePosition // Center node's relative position is its absolute position
    }

    // Find the path to the node
    const findNodePath = (targetId: string, nodeList: Node3D[], path: Node3D[] = []): Node3D[] | null => {
      for (const node of nodeList) {
        const currentPath = [...path, node]
        if (node.id === targetId) {
          return currentPath
        }
        if (node.children) {
          const found = findNodePath(targetId, node.children, currentPath)
          if (found) return found
        }
      }
      return null
    }

    const nodePath = findNodePath(nodeId, nodes)
    if (!nodePath) return { x: 0, y: 0, z: 0 }

    // Calculate absolute position by accumulating relative positions
    let absolutePosition = centerNode.relativePosition
    for (const node of nodePath) {
      absolutePosition = calculateAbsolutePosition(node, absolutePosition)
    }

    return absolutePosition
  }, [])

  return {
    findNodeById,
    buildBreadcrumbPath,
    getAbsolutePosition,
    getNodeAbsolutePosition,
  }
}
