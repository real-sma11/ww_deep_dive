"use client"

import { useEffect, useRef } from "react"
import { useThree } from "@react-three/fiber"
import { Environment } from "@react-three/drei"
import * as THREE from "three"
import { AnimatedNodeSphere } from "./AnimatedNodeSphere"
import { AnimatedConnectionLine } from "./AnimatedConnectionLine"
import { ParticleField } from "./ParticleField"
import type { NetworkState, Node3D, Position3D } from "../types/node"
import { nodeDescriptions } from "../data/nodeDescriptions"

interface NetworkSceneProps {
  networkState: NetworkState
  focusedNodeVisualPosition: Position3D | null
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
  onEmptySpaceInteraction: (isInteracting: boolean) => void
}

export function NetworkScene({
  networkState,
  focusedNodeVisualPosition,
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
  onEmptySpaceInteraction,
}: NetworkSceneProps) {
  const { camera, controls, size, gl } = useThree()
  const hasAdjustedCamera = useRef(false)
  const emptySpaceInteractionRef = useRef(false)

  const nodeMatchesFilter = (nodeId: string, selectedProtocols: string[], selectedIncome: string[], searchTerm: string): boolean => {
    if (selectedProtocols.length === 0 && selectedIncome.length === 0 && searchTerm.trim().length === 0) return true

    let protocolMatch = true
    let incomeMatch = true
    let searchMatch = true

    // Check protocol match
    if (selectedProtocols.length > 0) {
      const nodeData = nodeDescriptions[nodeId]
      if (!nodeData || !nodeData.protocols) {
        protocolMatch = false
      } else {
        protocolMatch = nodeData.protocols.some((protocol) => selectedProtocols.includes(protocol))
      }
    }

    // Check income match
    if (selectedIncome.length > 0) {
      const nodeData = nodeDescriptions[nodeId]
      if (!nodeData || !nodeData.income) {
        incomeMatch = false
      } else {
        incomeMatch = nodeData.income.some((income) => selectedIncome.includes(income))
      }
    }

    // Check search match
    if (searchTerm.trim().length > 0) {
      const nodeData = nodeDescriptions[nodeId]
      const nodeName = nodeData ? Object.keys(nodeDescriptions).find((key) => key === nodeId) : nodeId
      const displayName = nodeName ? nodeName.replace(/-/g, " ").toLowerCase() : ""
      const searchLower = searchTerm.toLowerCase()

      // Also check the actual display name from the node
      const node = findNodeById(nodeId, networkState.nodes, networkState.centerNode)
      const nodeDisplayName = node ? node.name.toLowerCase() : ""

      searchMatch = displayName.includes(searchLower) || nodeDisplayName.includes(searchLower)
    }

    // All conditions must be true if their respective filters are active
    return protocolMatch && incomeMatch && searchMatch
  }

  // Function to collect all visible node positions
  const collectAllNodePositions = (nodes: Node3D[], centerNode: Node3D): Position3D[] => {
    const positions: Position3D[] = []

    // Add center node
    positions.push(centerNode.position)

    // Recursively collect positions from expanded nodes
    const collectFromNode = (node: Node3D) => {
      positions.push(node.position)
      if (node.children && node.expanded) {
        node.children.forEach(collectFromNode)
      }
    }

    nodes.forEach(collectFromNode)
    return positions
  }

  // Function to calculate bounding box and adjust camera
  const adjustCameraToFitNodes = () => {
    console.log("adjustCameraToFitNodes called", { isAllExpanded, hasAdjusted: hasAdjustedCamera.current })

    if (!isAllExpanded || hasAdjustedCamera.current) return

    const positions = collectAllNodePositions(networkState.nodes, networkState.centerNode)
    console.log("Collected positions:", positions.length, positions)

    if (positions.length === 0) return

    // Calculate bounding box with proper padding for node sizes and labels
    const boundingBox = new THREE.Box3()
    positions.forEach((pos) => {
      // Account for node size, glow, and label space
      const padding = 1.2 // Increased to account for labels and glow
      boundingBox.expandByPoint(new THREE.Vector3(pos.x - padding, pos.y - padding, pos.z - padding))
      boundingBox.expandByPoint(new THREE.Vector3(pos.x + padding, pos.y + padding, pos.z + padding))
    })

    // Get bounding box size and center
    const boundingBoxSize = boundingBox.getSize(new THREE.Vector3())
    const boundingBoxCenter = boundingBox.getCenter(new THREE.Vector3())

    console.log("Bounding box:", { boundingBoxSize, boundingBoxCenter })

    // Calculate required distance with proper aspect ratio and FOV consideration
    const aspect = size.width / size.height
    const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180)
    
    // Calculate distance needed for both dimensions
    const verticalFOV = fov
    const horizontalFOV = 2 * Math.atan(Math.tan(verticalFOV / 2) * aspect)
    
    const distanceForHeight = (boundingBoxSize.y / 2) / Math.tan(verticalFOV / 2)
    const distanceForWidth = (boundingBoxSize.x / 2) / Math.tan(horizontalFOV / 2)
    
    // Use the larger distance and add margin
    const distance = Math.max(distanceForHeight, distanceForWidth) * 1.25 // Increased margin

    // Set reasonable bounds
    const minDistance = 8
    const maxDistance = 40 // Increased max distance
    const targetDistance = Math.max(minDistance, Math.min(distance, maxDistance))

    console.log("Camera adjustment:", { 
      boundingBoxSize, 
      aspect, 
      fov: fov * 180 / Math.PI, 
      verticalFOV: verticalFOV * 180 / Math.PI,
      horizontalFOV: horizontalFOV * 180 / Math.PI,
      distanceForHeight, 
      distanceForWidth, 
      distance, 
      targetDistance 
    })

    // Get current camera direction
    const currentDirection = new THREE.Vector3()
    camera.getWorldDirection(currentDirection)
    currentDirection.negate()

    // Calculate new camera position
    const newPosition = boundingBoxCenter.clone().add(currentDirection.multiplyScalar(targetDistance))

    console.log("New camera position:", newPosition)

    // Direct camera adjustment without animation for immediate effect
    camera.position.copy(newPosition)
    camera.lookAt(boundingBoxCenter)

    // Update controls target to the bounding box center for better panning
    if (controls && "target" in controls) {
      ;(controls as any).target.copy(boundingBoxCenter)
      ;(controls as any).update()
    }

    hasAdjustedCamera.current = true
    console.log("Camera adjusted successfully")
  }

  // Function to center camera on a specific node (for info mode) - PRESERVE ZOOM
  const centerCameraOnNode = (nodeId: string) => {
    const node = findNodeById(nodeId, networkState.nodes, networkState.centerNode)
    if (!node) return

    const nodePosition = new THREE.Vector3(node.position.x, node.position.y, node.position.z)
    
    // Calculate current distance from camera to current target to preserve zoom level
    let currentDistance = 12 // Default fallback distance
    if (controls && "target" in controls) {
      const currentTarget = (controls as any).target
      currentDistance = camera.position.distanceTo(currentTarget)
    } else {
      // Fallback: calculate distance from camera to origin
      currentDistance = camera.position.distanceTo(new THREE.Vector3(0, 0, 0))
    }

    // Get current camera direction or calculate direction to new node
    const currentDirection = new THREE.Vector3()
    camera.getWorldDirection(currentDirection)
    currentDirection.negate()

    // Position camera at the same distance but looking at the new node
    const newPosition = nodePosition.clone().add(currentDirection.multiplyScalar(currentDistance))
    
    camera.position.copy(newPosition)
    camera.lookAt(nodePosition)

    // Update controls target to the selected node
    if (controls && "target" in controls) {
      ;(controls as any).target.copy(nodePosition)
      ;(controls as any).update()
    }

    console.log(`Camera centered on node: ${nodeId} at distance: ${currentDistance}`)
  }

  // Function to zoom back in when closing all nodes
  const adjustCameraToOriginalView = () => {
    console.log("adjustCameraToOriginalView called")

    // Reset to original camera position
    const originalPosition = new THREE.Vector3(8, 8, 8)
    const originalTarget = new THREE.Vector3(0, 0, 0)

    camera.position.copy(originalPosition)
    camera.lookAt(originalTarget)

    // Update controls if available - reset target to hub
    if (controls && "target" in controls) {
      ;(controls as any).target.set(0, 0, 0)
      ;(controls as any).update()
    }

    hasAdjustedCamera.current = false
    console.log("Camera reset to original view")
  }

  // Handle empty space interactions
  const handleEmptySpacePointerDown = (e: THREE.Event) => {
    if (e.button !== 0) return // Only left mouse button
    console.log("Empty space pointer down - starting interaction")
    emptySpaceInteractionRef.current = true
    onEmptySpaceInteraction(true)
  }

  const handleEmptySpacePointerUp = (e: THREE.Event) => {
    console.log("Empty space pointer up - ending interaction")
    emptySpaceInteractionRef.current = false
    onEmptySpaceInteraction(false)
  }

  // Effect to center camera on info node
  useEffect(() => {
    if (infoNodeId) {
      centerCameraOnNode(infoNodeId)
    }
  }, [infoNodeId])

  // Effect to center camera on info node or details node
  useEffect(() => {
    if (infoNodeId) {
      centerCameraOnNode(infoNodeId)
    } else if (networkState.isZoomedIn && networkState.focusedNodeId) {
      centerCameraOnNode(networkState.focusedNodeId)
    }
  }, [infoNodeId, networkState.isZoomedIn, networkState.focusedNodeId])

  // Trigger camera adjustment when expand all is activated, and zoom back when deactivated
  useEffect(() => {
    console.log("Camera adjustment effect triggered", { isAllExpanded, hasAdjusted: hasAdjustedCamera.current })

    if (isAllExpanded && !hasAdjustedCamera.current) {
      // Zoom out when expanding all
      const timer = setTimeout(() => {
        console.log("Executing camera zoom out after delay")
        adjustCameraToFitNodes()
      }, 1000)

      return () => clearTimeout(timer)
    } else if (!isAllExpanded && hasAdjustedCamera.current) {
      // Zoom back in when closing all nodes
      const timer = setTimeout(() => {
        console.log("Executing camera zoom in after delay")
        adjustCameraToOriginalView()
      }, 300)

      return () => clearTimeout(timer)
    }
  }, [isAllExpanded, networkState.nodes, networkState.centerNode])

  // Transform coordinates for details mode
  const transformNodeForDisplay = (node: Node3D): Node3D => {
    if (!networkState.isZoomedIn || networkState.focusedNodeId === "center") {
      return node
    }

    const focusedNode = findNodeById(networkState.focusedNodeId, networkState.nodes, networkState.centerNode)
    if (!focusedNode) {
      return node
    }

    // If this is the focused node itself, position it at origin
    if (node.id === networkState.focusedNodeId) {
      return { ...node, position: { x: 0, y: 0, z: 0 } }
    }

    // For all other nodes, transform relative to focused node's position
    const transformedPosition = {
      x: node.position.x - focusedNode.position.x,
      y: node.position.y - focusedNode.position.y,
      z: node.position.z - focusedNode.position.z,
    }

    return { ...node, position: transformedPosition }
  }

  // Transform drag position back to actual coordinates
  const transformDragPosition = (nodeId: string, tempPosition: Position3D): Position3D => {
    if (!networkState.isZoomedIn || networkState.focusedNodeId === "center") {
      return tempPosition
    }

    const focusedNode = findNodeById(networkState.focusedNodeId, networkState.nodes, networkState.centerNode)
    if (!focusedNode) {
      return tempPosition
    }

    // If dragging the focused node itself, handle visual position
    if (nodeId === networkState.focusedNodeId) {
      return {
        x: focusedNode.position.x + tempPosition.x,
        y: focusedNode.position.y + tempPosition.y,
        z: focusedNode.position.z + tempPosition.z,
      }
    }

    // Convert temporary position back to actual position
    return {
      x: tempPosition.x + focusedNode.position.x,
      y: tempPosition.y + focusedNode.position.y,
      z: tempPosition.z + focusedNode.position.z,
    }
  }

  // ONE SINGLE RENDERING FUNCTION USED BY BOTH MODES
  const renderNodeAndChildren = (node: Node3D, parent?: Node3D, isChild = false) => {
    const displayNode = transformNodeForDisplay(node)

    // Determine if this node should be greyed out (only for filtering, not expand all)
    const isFiltering = selectedProtocols.length > 0 || selectedIncome.length > 0 || searchTerm.trim().length > 0
    const nodeMatchesCurrentFilter = nodeMatchesFilter(node.id, selectedProtocols, selectedIncome, searchTerm)
    const isGreyedOut = isFiltering && !nodeMatchesCurrentFilter

    // Highlight the info node if in info mode OR the details node in details mode
    const isInfoHighlighted = infoNodeId === node.id
    const isDetailsHighlighted = detailsNodeId === node.id

    // Create a modified node with appropriate visual properties
    let nodeForDisplay = displayNode
    if (isGreyedOut) {
      nodeForDisplay = { ...displayNode, color: "#666666", glowColor: "#666666" }
    } else if (isInfoHighlighted || isDetailsHighlighted) {
      // Highlight the GLOW instead of the node globe - keep original node color, change glow to bright gold
      nodeForDisplay = { ...displayNode, glowColor: "#FFD700" } // Bright gold glow highlight
    } else if (isFiltering && nodeMatchesCurrentFilter) {
      // Node matches filter - keep normal color but add green glow
      nodeForDisplay = { ...displayNode, glowColor: "#00FF00" }
    }

    return (
      <group key={node.id}>
        <AnimatedNodeSphere
          node={nodeForDisplay}
          isCenter={!parent}
          isChild={isChild}
          parentExpanded={parent ? parent.expanded : true}
          onClick={onNodeClick}
          onDoubleClick={onNodeDoubleClick}
          onNodeDrag={(nodeId, newPosition) => {
            const actualPosition = transformDragPosition(nodeId, newPosition)
            onNodeDrag(nodeId, actualPosition)
          }}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          emptySpaceInteractionActive={emptySpaceInteractionRef.current}
        />

        {/* Render connection line from parent to this node */}
        {parent && (
          <AnimatedConnectionLine
            start={transformNodeForDisplay(parent).position}
            end={nodeForDisplay.position}
            color={isGreyedOut ? "#666666" : isInfoHighlighted || isDetailsHighlighted ? "#FFD700" : node.color}
            visible={parent.expanded}
          />
        )}

        {/* Recursively render children if node is expanded */}
        {node.children && node.expanded && node.children.map((child) => renderNodeAndChildren(child, node, true))}
      </group>
    )
  }

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#FFD700" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#87CEEB" />
      <spotLight position={[0, 10, 0]} angle={0.3} penumbra={1} intensity={1} color="#FFD700" />
      <ParticleField />
      <Environment preset="night" />

      {/* Invisible plane to catch empty space interactions */}
      <mesh
        position={[0, 0, -10]}
        onPointerDown={handleEmptySpacePointerDown}
        onPointerUp={handleEmptySpacePointerUp}
        visible={false}
      >
        <planeGeometry args={[1000, 1000]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* IDENTICAL RENDERING FOR BOTH OVERVIEW AND DETAILS MODES */}
      <group>
        {(() => {
          if (networkState.isZoomedIn) {
            const focusedNode = findNodeById(networkState.focusedNodeId, networkState.nodes, networkState.centerNode)

            if (!focusedNode) {
              // Fallback to center node if focused node not found
              return (
                <>
                  {renderNodeAndChildren(networkState.centerNode)}
                  {networkState.nodes.map((node) => (
                    <group key={node.id}>{renderNodeAndChildren(node, networkState.centerNode, false)}</group>
                  ))}
                </>
              )
            }

            if (focusedNode.id === "center") {
              // Show center node and primary nodes
              return (
                <>
                  {renderNodeAndChildren(networkState.centerNode)}
                  {networkState.nodes.map((node) => (
                    <group key={node.id}>{renderNodeAndChildren(node, networkState.centerNode, false)}</group>
                  ))}
                </>
              )
            } else {
              // Show the focused node and its children
              return renderNodeAndChildren(focusedNode)
            }
          } else {
            // Overview mode - show everything
            return (
              <>
                {renderNodeAndChildren(networkState.centerNode)}
                {networkState.nodes.map((node) => (
                  <group key={node.id}>{renderNodeAndChildren(node, networkState.centerNode, false)}</group>
                ))}
              </>
            )
          }
        })()}
      </group>
    </>
  )
}
