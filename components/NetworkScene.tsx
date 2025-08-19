"use client"

import { useEffect, useRef } from "react"
import { useThree } from "@react-three/fiber"
import { Environment } from "@react-three/drei"
import { AnimatedNodeSphere } from "./AnimatedNodeSphere"
import { AnimatedConnectionLine } from "./AnimatedConnectionLine"
import { ParticleField } from "./ParticleField"
import type { NetworkState, Node3D, Position3D } from "../types/node"
import { nodeDescriptions } from "../data/nodeDescriptions"
import * as THREE from "three"

interface NetworkSceneProps {
  networkState: NetworkState
  onNodeClick: (node: Node3D) => void
  onNodeDoubleClick: (node: Node3D) => void
  onNodeDrag: (nodeId: string, newPosition: Position3D) => void
  onDragStart: () => void
  onDragEnd: () => void
  findNodeById: (nodeId: string, nodes: Node3D[], centerNode: Node3D) => Node3D | null
  isAllExpanded: boolean
  selectedProtocols: string[]
  selectedIncome: string[]
  searchTerm?: string
  infoNodeId?: string | null
  detailsNodeId?: string | null
  controlsInteracting: boolean
  isRotateMode: boolean
}

export function NetworkScene({
  networkState,
  onNodeClick,
  onNodeDoubleClick,
  onNodeDrag,
  onDragStart,
  onDragEnd,
  findNodeById,
  isAllExpanded,
  selectedProtocols,
  selectedIncome,
  searchTerm = "",
  infoNodeId = null,
  detailsNodeId = null,
  controlsInteracting,
  isRotateMode,
}: NetworkSceneProps) {
  const { camera, controls, size, gl } = useThree()
  const hasAdjustedCamera = useRef(false)
  const cameraAdjustmentInProgress = useRef(false)

  const nodeMatchesFilter = (nodeId: string): boolean => {
    if (selectedProtocols.length === 0 && selectedIncome.length === 0 && searchTerm.trim().length === 0) return true
    const nodeData = nodeDescriptions[nodeId]
    const node = findNodeById(nodeId, networkState.nodes, networkState.centerNode)
    if (!nodeData || !node) return false

    const protocolMatch =
      selectedProtocols.length === 0 ||
      (nodeData.protocols && nodeData.protocols.some((p) => selectedProtocols.includes(p)))
    const incomeMatch =
      selectedIncome.length === 0 || (nodeData.income && nodeData.income.some((i) => selectedIncome.includes(i)))
    const searchMatch = searchTerm.trim().length === 0 || node.name.toLowerCase().includes(searchTerm.toLowerCase())

    return protocolMatch && incomeMatch && searchMatch
  }

  const adjustCameraToFitNodes = () => {
    if (cameraAdjustmentInProgress.current || !isAllExpanded || hasAdjustedCamera.current) return
    cameraAdjustmentInProgress.current = true

    const positions = collectAllNodePositions(networkState.nodes, networkState.centerNode)
    if (positions.length === 0) {
      cameraAdjustmentInProgress.current = false
      return
    }

    const boundingBox = new THREE.Box3()
    positions.forEach((pos) => boundingBox.expandByPoint(new THREE.Vector3(pos.x, pos.y, pos.z)))

    const boundingBoxSize = boundingBox.getSize(new THREE.Vector3())
    const boundingBoxCenter = boundingBox.getCenter(new THREE.Vector3())
    const aspect = size.width / size.height
    const fov = (camera as any).fov * (Math.PI / 180)
    const fovAdjust = Math.tan(fov / 2)
    const distance = Math.max(boundingBoxSize.y / (2 * fovAdjust), boundingBoxSize.x / (2 * aspect * fovAdjust)) * 1.5
    const targetDistance = Math.max(8, Math.min(distance, 40))

    const cameraDirection = new THREE.Vector3().subVectors(camera.position, (controls as any).target).normalize()
    const newPosition = boundingBoxCenter.clone().add(cameraDirection.multiplyScalar(targetDistance))

    camera.position.copy(newPosition)
    camera.lookAt(boundingBoxCenter)
    if (controls && "target" in controls) {
      ;(controls as any).target.copy(boundingBoxCenter)
      ;(controls as any).update()
    }

    hasAdjustedCamera.current = true
    cameraAdjustmentInProgress.current = false
  }

  const adjustCameraToOriginalView = () => {
    camera.position.set(8, 8, 8)
    camera.lookAt(0, 0, 0)
    if (controls && "target" in controls) {
      ;(controls as any).target.set(0, 0, 0)
      ;(controls as any).update()
    }
    hasAdjustedCamera.current = false
  }

  const collectAllNodePositions = (nodes: Node3D[], centerNode: Node3D): Position3D[] => {
    const positions: Position3D[] = [centerNode.position]
    const collect = (nodeList: Node3D[]) => {
      nodeList.forEach((node) => {
        positions.push(node.position)
        if (node.children && node.expanded) collect(node.children)
      })
    }
    collect(nodes)
    return positions
  }

  const adjustmentTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  useEffect(() => {
    if (adjustmentTimeoutRef.current) clearTimeout(adjustmentTimeoutRef.current)
    if (isAllExpanded && !hasAdjustedCamera.current) {
      adjustmentTimeoutRef.current = setTimeout(adjustCameraToFitNodes, 1000)
    } else if (!isAllExpanded && hasAdjustedCamera.current) {
      adjustmentTimeoutRef.current = setTimeout(adjustCameraToOriginalView, 300)
    }
    return () => {
      if (adjustmentTimeoutRef.current) clearTimeout(adjustmentTimeoutRef.current)
    }
  }, [isAllExpanded])

  const { flatNodes, connections } = (() => {
    const flatNodes: { node: Node3D; parent?: Node3D }[] = []
    const connections: { start: Position3D; end: Position3D; color: string; visible: boolean; key: string }[] = []

    const collect = (node: Node3D, parent?: Node3D) => {
      // In details mode, only show the focused node and its descendants
      if (networkState.isZoomedIn) {
        const focusedNode = findNodeById(networkState.focusedNodeId, networkState.nodes, networkState.centerNode)
        if (focusedNode) {
          // Check if this node is the focused node or a descendant of it
          const isInFocusedSubtree = (targetNode: Node3D, rootNode: Node3D): boolean => {
            if (targetNode.id === rootNode.id) return true
            if (rootNode.children) {
              return rootNode.children.some((child) => isInFocusedSubtree(targetNode, child))
            }
            return false
          }

          if (!isInFocusedSubtree(node, focusedNode)) {
            return // Skip nodes not in the focused subtree
          }
        }
      }

      // Only add node if all its ancestors are expanded
      const isVisible = !parent || (parent.expanded && isNodeVisible(parent))

      if (isVisible) {
        flatNodes.push({ node, parent })
        if (parent) {
          connections.push({
            start: parent.position,
            end: node.position,
            color: node.color,
            visible: parent.expanded,
            key: `${parent.id}-${node.id}`,
          })
        }
      }

      // Only recurse into children if this node is visible and expanded
      if (isVisible && node.expanded && node.children) {
        node.children.forEach((child) => collect(child, node))
      }
    }

    // Helper function to check if a node should be visible based on ancestor expansion
    const isNodeVisible = (node: Node3D): boolean => {
      // In details mode, we need to check visibility within the focused subtree
      if (networkState.isZoomedIn) {
        const focusedNode = findNodeById(networkState.focusedNodeId, networkState.nodes, networkState.centerNode)
        if (focusedNode && focusedNode.id !== "center") {
          // Find path within the focused subtree
          const findNodePathInSubtree = (
            targetId: string,
            currentNode: Node3D,
            path: Node3D[] = [],
          ): Node3D[] | null => {
            const currentPath = [...path, currentNode]
            if (currentNode.id === targetId) {
              return currentPath
            }
            if (currentNode.children) {
              for (const child of currentNode.children) {
                const found = findNodePathInSubtree(targetId, child, currentPath)
                if (found) return found
              }
            }
            return null
          }

          const nodePath = findNodePathInSubtree(node.id, focusedNode)
          if (nodePath) {
            return nodePath.slice(0, -1).every((n) => n.expanded)
          }
          return false
        }
      }

      // Normal visibility check for overview mode
      const findNodePath = (targetId: string, currentNode: Node3D, path: Node3D[] = []): Node3D[] | null => {
        const currentPath = [...path, currentNode]
        if (currentNode.id === targetId) {
          return currentPath
        }
        if (currentNode.children) {
          for (const child of currentNode.children) {
            const found = findNodePath(targetId, child, currentPath)
            if (found) return found
          }
        }
        return null
      }

      // Check center node path
      let nodePath = findNodePath(node.id, networkState.centerNode)
      if (nodePath) {
        return nodePath.slice(0, -1).every((n) => n.expanded)
      }

      // Check in main nodes
      for (const rootNode of networkState.nodes) {
        nodePath = findNodePath(node.id, rootNode, [networkState.centerNode])
        if (nodePath) {
          return nodePath.slice(0, -1).every((n) => n.expanded)
        }
      }

      return false
    }

    // Start collection based on mode
    if (networkState.isZoomedIn) {
      // In details mode, start from the focused node
      const focusedNode = findNodeById(networkState.focusedNodeId, networkState.nodes, networkState.centerNode)
      if (focusedNode) {
        collect(focusedNode)
      }
    } else {
      // In overview mode, show the complete network
      collect(networkState.centerNode)
      networkState.nodes.forEach((node) => collect(node, networkState.centerNode))
    }

    return { flatNodes, connections }
  })()

  const getDisplayNode = (node: Node3D) => {
    const isFiltering = selectedProtocols.length > 0 || selectedIncome.length > 0 || searchTerm.trim().length > 0
    const matchesFilter = nodeMatchesFilter(node.id)
    const isHighlighted = infoNodeId === node.id || detailsNodeId === node.id

    if (isFiltering && !matchesFilter) {
      return { ...node, color: "#666666", glowColor: "#666666" }
    }
    if (isHighlighted) {
      return { ...node, glowColor: "#FFD700" }
    }
    if (isFiltering && matchesFilter) {
      return { ...node, glowColor: "#00FF00" }
    }
    return node
  }

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#FFD700" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#87CEEB" />
      <spotLight position={[0, 10, 0]} angle={0.3} penumbra={1} intensity={1} color="#FFD700" />
      <ParticleField />
      <Environment preset="night" />

      <group>
        {flatNodes.map(({ node, parent }) => (
          <AnimatedNodeSphere
            key={node.id}
            node={getDisplayNode(node)}
            parentNode={parent}
            isCenter={!parent}
            onClick={onNodeClick}
            onDoubleClick={onNodeDoubleClick}
            onNodeDrag={onNodeDrag}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            isRotateMode={isRotateMode}
          />
        ))}
        {connections.map((conn) => (
          <AnimatedConnectionLine
            key={conn.key}
            start={conn.start}
            end={conn.end}
            color={conn.color}
            visible={conn.visible}
          />
        ))}
      </group>
    </>
  )
}
