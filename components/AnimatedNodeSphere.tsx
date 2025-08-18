"use client"

import { useRef, useState } from "react"
import { useThree, useFrame } from "@react-three/fiber"
import { Html } from "@react-three/drei"
import * as THREE from "three"
import type { Node3D, Position3D } from "../types/node"

interface AnimatedNodeSphereProps {
  node: Node3D
  isCenter?: boolean
  isChild?: boolean
  parentExpanded?: boolean
  onClick: (node: Node3D) => void
  onDoubleClick: (node: Node3D) => void
  onNodeDrag: (nodeId: string, newPosition: Position3D) => void
  onDragStart: () => void
  onDragEnd: () => void
  delay?: number
  emptySpaceInteractionActive?: boolean
}

export function AnimatedNodeSphere({
  node,
  isCenter = false,
  isChild = false,
  parentExpanded = true,
  onClick,
  onDoubleClick,
  onNodeDrag,
  onDragStart,
  onDragEnd,
  emptySpaceInteractionActive = false,
}: AnimatedNodeSphereProps) {
  const { camera, gl } = useThree()
  const meshRef = useRef<THREE.Mesh>(null)
  const groupRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)

  // Use refs to track drag state and avoid closure issues
  const isDraggingRef = useRef(false)
  const dragStarted = useRef(false)
  const isShiftDraggingRef = useRef(false)
  const dragInfo = useRef({
    plane: new THREE.Plane(),
    offset: new THREE.Vector3(),
    startClientX: 0,
    startClientY: 0,
    startNodePosition: new THREE.Vector3(),
    initialDistance: 0,
  })

  const size = isCenter ? 0.48 : 0.32
  const glowSize = isCenter ? 0.72 : 0.56
  const position: [number, number, number] = [node.position.x, node.position.y, node.position.z]
  const hasChildren = node.children && node.children.length > 0

  // Use the node's glow color if available, otherwise fall back to the node color
  const glowColor = node.glowColor || node.color

  // Enhanced visual properties based on node hierarchy and color family
  const getNodeVisualProperties = () => {
    const baseColor = node.color
    // Use material properties from the node if they exist, otherwise provide defaults
    const metalness = node.metalness ?? (isCenter ? 0.9 : 0.5)
    const roughness = node.roughness ?? (isCenter ? 0.1 : 0.4)
    const emissiveIntensity = isCenter ? 0.4 : hasChildren ? 0.25 : 0.15

    return {
      color: baseColor,
      emissiveColor: baseColor,
      emissiveIntensity,
      metalness,
      roughness,
    }
  }

  const visualProps = getNodeVisualProperties()

  useFrame((state, delta) => {
    if (isChild && groupRef.current) {
      const targetScale = parentExpanded ? 1 : 0
      const currentScale = groupRef.current.scale.x
      if (Math.abs(currentScale - targetScale) > 0.01) {
        const newScale = THREE.MathUtils.lerp(currentScale, targetScale, delta * 3)
        groupRef.current.scale.setScalar(newScale)
      }
    }

    if (meshRef.current) {
      const baseScale = hasChildren ? size * 1.02 : size // Much smaller difference for nodes with children
      const targetScale = hovered && !isDraggingRef.current ? baseScale * 1.08 : baseScale // Reduced hover scaling
      const currentScale = meshRef.current.scale.x
      if (Math.abs(currentScale - targetScale) > 0.01) {
        const newScale = THREE.MathUtils.lerp(currentScale, targetScale, delta * 8)
        meshRef.current.scale.setScalar(newScale)
      }
    }

    // Subtle pulsing for center node
    if (isCenter && meshRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.005 // Further reduced pulse intensity
      const currentScale = meshRef.current.scale.x
      meshRef.current.scale.setScalar(currentScale * pulse)
    }

    // Subtle pulsing for nodes with children
    if (hasChildren && !isCenter && meshRef.current) {
      const subtlePulse = 1 + Math.sin(state.clock.elapsedTime * 1.5 + node.id.length) * 0.008 // Further reduced pulse intensity
      const currentScale = meshRef.current.scale.x
      meshRef.current.scale.setScalar(currentScale * subtlePulse)
    }
  })

  const handlePointerDown = (e: THREE.Event) => {
    // If empty space interaction is active (user started rotating), ignore node interactions
    if (emptySpaceInteractionActive) {
      console.log(`Ignoring node interaction for ${node.id} - empty space interaction active`)
      return
    }

    console.log(`Pointer down on node: ${node.id}`, node.position)
    if (e.button !== 0) return // Only left mouse button
    e.stopPropagation()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)

    // Reset drag state
    isDraggingRef.current = false
    dragStarted.current = false
    isShiftDraggingRef.current = false

    // Store the starting mouse position and node position
    dragInfo.current.startClientX = e.clientX
    dragInfo.current.startClientY = e.clientY
    dragInfo.current.startNodePosition.set(node.position.x, node.position.y, node.position.z)

    // Calculate initial distance from camera to node for depth dragging
    dragInfo.current.initialDistance = camera.position.distanceTo(dragInfo.current.startNodePosition)

    // Set up the drag plane using the CURRENT DISPLAY POSITION
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(
      { x: (e.clientX / gl.domElement.clientWidth) * 2 - 1, y: -(e.clientY / gl.domElement.clientHeight) * 2 + 1 },
      camera,
    )

    // Use the actual display position of the node
    const currentPosition = new THREE.Vector3(node.position.x, node.position.y, node.position.z)

    dragInfo.current.plane.setFromNormalAndCoplanarPoint(
      camera.getWorldDirection(dragInfo.current.plane.normal),
      currentPosition,
    )

    const intersectionPoint = new THREE.Vector3()
    raycaster.ray.intersectPlane(dragInfo.current.plane, intersectionPoint)
    dragInfo.current.offset.copy(intersectionPoint).sub(currentPosition)
  }

  const handlePointerMove = (e: THREE.Event) => {
    // If empty space interaction is active, ignore node interactions
    if (emptySpaceInteractionActive) {
      return
    }

    if (!e.buttons) return // No button is pressed
    e.stopPropagation()

    // Check if we should start dragging based on mouse movement threshold
    if (!dragStarted.current) {
      const deltaX = e.clientX - dragInfo.current.startClientX
      const deltaY = e.clientY - dragInfo.current.startClientY
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

      if (distance > 5) {
        // 5 pixel threshold to start dragging
        console.log(`Starting drag for node: ${node.id}`)
        dragStarted.current = true
        isDraggingRef.current = true
        isShiftDraggingRef.current = e.shiftKey
        onDragStart()
        gl.domElement.style.cursor = isShiftDraggingRef.current ? "ns-resize" : "grabbing"
      }
    }

    if (isDraggingRef.current) {
      if (isShiftDraggingRef.current) {
        // Shift+drag: Move node closer/farther from camera
        const deltaY = e.clientY - dragInfo.current.startClientY
        const depthSensitivity = 0.02
        const depthDelta = deltaY * depthSensitivity

        // Calculate direction from camera to node
        const cameraToNode = new THREE.Vector3()
        cameraToNode.subVectors(dragInfo.current.startNodePosition, camera.position).normalize()

        // Calculate new position along the camera-to-node direction
        const newDistance = Math.max(1, dragInfo.current.initialDistance + depthDelta) // Minimum distance of 1
        const newPosition = camera.position.clone().add(cameraToNode.multiplyScalar(newDistance))

        console.log(`Depth dragging node ${node.id} to distance:`, newDistance)
        onNodeDrag(node.id, { x: newPosition.x, y: newPosition.y, z: newPosition.z })
      } else {
        // Normal drag: Move node in screen plane
        const raycaster = new THREE.Raycaster()
        raycaster.setFromCamera(
          { x: (e.clientX / gl.domElement.clientWidth) * 2 - 1, y: -(e.clientY / gl.domElement.clientHeight) * 2 + 1 },
          camera,
        )

        const intersectionPoint = new THREE.Vector3()
        raycaster.ray.intersectPlane(dragInfo.current.plane, intersectionPoint)
        const newPosition = intersectionPoint.sub(dragInfo.current.offset)
        console.log(`Dragging node ${node.id} to:`, { x: newPosition.x, y: newPosition.y, z: newPosition.z })
        onNodeDrag(node.id, { x: newPosition.x, y: newPosition.y, z: newPosition.z })
      }
    }
  }

  const handlePointerUp = (e: THREE.Event) => {
    // If empty space interaction is active, ignore node interactions
    if (emptySpaceInteractionActive) {
      return
    }

    console.log(`Pointer up on node: ${node.id}, dragStarted: ${dragStarted.current}`)
    e.stopPropagation()

    // If we never started dragging, treat it as a click
    if (!dragStarted.current) {
      onClick(node)
    }

    // Clean up drag state
    isDraggingRef.current = false
    dragStarted.current = false
    isShiftDraggingRef.current = false
    onDragEnd()
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    gl.domElement.style.cursor = hovered ? "grab" : "default"
  }

  const handlePointerOver = (e: THREE.Event) => {
    // If empty space interaction is active, don't change hover state
    if (emptySpaceInteractionActive) {
      return
    }

    e.stopPropagation()
    setHovered(true)
    if (!isDraggingRef.current) {
      // Show different cursor if shift is held
      gl.domElement.style.cursor = e.shiftKey ? "ns-resize" : "grab"
    }
  }

  const handlePointerOut = () => {
    // Always allow pointer out to reset hover state
    setHovered(false)
    if (!isDraggingRef.current) {
      gl.domElement.style.cursor = "default"
    }
  }

  const handleDoubleClick = (e: THREE.Event) => {
    // If empty space interaction is active, ignore double clicks
    if (emptySpaceInteractionActive) {
      console.log(`Ignoring double-click for ${node.id} - empty space interaction active`)
      return
    }

    console.log(`Double-click on node: ${node.id}`)
    e.stopPropagation()
    onDoubleClick(node)
  }

  if (isChild && !parentExpanded && (groupRef.current?.scale.x ?? 1) < 0.01) {
    return null
  }

  return (
    <group ref={groupRef} position={position}>
      <mesh scale={glowSize}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={
            // Only increase opacity if this is a selected node (gold glow), otherwise use normal opacity
            glowColor === "#FFD700" 
              ? (hasChildren ? 0.8 : 0.7) * (isChild ? (groupRef.current?.scale.x ?? 1) : 1) // Higher opacity for selected nodes
              : (hasChildren ? 0.35 : 0.25) * (isChild ? (groupRef.current?.scale.x ?? 1) : 1) // Normal opacity for non-selected
          }
          side={THREE.BackSide}
        />
      </mesh>

      <mesh
        ref={meshRef}
        scale={size}
        onDoubleClick={handleDoubleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerOut={handlePointerOut}
        onPointerOver={handlePointerOver}
      >
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color={visualProps.color}
          emissive={visualProps.emissiveColor}
          emissiveIntensity={visualProps.emissiveIntensity}
          metalness={visualProps.metalness}
          roughness={visualProps.roughness}
          transparent
          opacity={isChild ? (groupRef.current?.scale.x ?? 1) : 1}
        />
      </mesh>

      {/* Enhanced node label with color family styling */}
      <Html distanceFactor={10} position={[0, -0.6, 0]}>
        <div
          style={{
            opacity: isChild ? (groupRef.current?.scale.x ?? 1) : 1,
            transform: `scale(${Math.max(isChild ? (groupRef.current?.scale.x ?? 1) : 1, 0.1)})`,
            transition: "opacity 0.3s ease, transform 0.3s ease",
            pointerEvents: "none", // Ensure labels don't block clicks
          }}
          className={`text-white text-center font-bold text-sm px-2 py-1 rounded backdrop-blur-sm border ${hasChildren ? `border-2 border-opacity-60` : "bg-black/50 border-gray-500/30"}`}
        >
          {node.name}
        </div>
      </Html>

      {/* Visual indicator for expandable nodes positioned outside the sphere to avoid blocking clicks */}
      {hasChildren && (
        <Html distanceFactor={15} position={[0.7, 0.7, 0]}>
          <div
            style={{
              opacity: isChild ? (groupRef.current?.scale.x ?? 1) : 1,
              color: "white",
              fontSize: "18px",
              fontWeight: "bold",
              textShadow: "0 0 4px rgba(0,0,0,0.8)",
              pointerEvents: "none",
              backgroundColor: "rgba(0,0,0,0.5)",
              borderRadius: "50%",
              width: "24px",
              height: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {node.expanded ? "-" : "+"}
          </div>
        </Html>
      )}
    </group>
  )
}
