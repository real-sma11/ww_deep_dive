"use client"

import { useRef, useState } from "react"
import { useThree, useFrame } from "@react-three/fiber"
import { Html, Billboard } from "@react-three/drei"
import * as THREE from "three"
import type { Node3D, Position3D } from "../types/node"

interface AnimatedNodeSphereProps {
  node: Node3D
  parentNode?: Node3D
  isCenter?: boolean
  onClick: (node: Node3D) => void
  onDoubleClick: (node: Node3D) => void
  onNodeDrag: (nodeId: string, newPosition: Position3D) => void
  onDragStart: () => void
  onDragEnd: () => void
  isRotateMode?: boolean
}

export function AnimatedNodeSphere({
  node,
  parentNode,
  isCenter = false,
  onClick,
  onDoubleClick,
  onNodeDrag,
  onDragStart,
  onDragEnd,
  isRotateMode = false,
}: AnimatedNodeSphereProps) {
  const { camera, gl } = useThree()
  const meshRef = useRef<THREE.Mesh>(null)
  const groupRef = useRef<THREE.Group>(null!)
  const [hovered, setHovered] = useState(false)

  const parentExpanded = !parentNode || parentNode.expanded

  // Internal state for animated position and scale
  const [currentPosition] = useState(
    () =>
      new THREE.Vector3(
        parentNode ? parentNode.position.x : node.position.x,
        parentNode ? parentNode.position.y : node.position.y,
        parentNode ? parentNode.position.z : node.position.z,
      ),
  )
  const [currentScale] = useState(() => new THREE.Vector3(parentNode ? 0 : 1, parentNode ? 0 : 1, parentNode ? 0 : 1))

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
    originalNodeId: "", // Track which node started the drag
  })

  useFrame((state, delta) => {
    const isVisible = !parentNode || parentNode.expanded
    const targetPosition = isVisible ? node.position : parentNode!.position
    const targetScale = isVisible ? 1 : 0

    // Animate position
    currentPosition.lerp(new THREE.Vector3(targetPosition.x, targetPosition.y, targetPosition.z), delta * 6)
    if (groupRef.current) {
      groupRef.current.position.copy(currentPosition)
    }

    // Animate scale
    currentScale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 6)
    if (groupRef.current) {
      groupRef.current.scale.copy(currentScale)
    }

    if (groupRef.current) {
      if (groupRef.current.scale.x < 0.01) {
        groupRef.current.visible = false
      } else {
        groupRef.current.visible = true
      }
    }

    if (meshRef.current) {
      const baseScale = parentExpanded ? 0.48 : 0.32
      const glowSize = parentExpanded ? 0.72 : 0.56
      const hasChildren = node.children && node.children.length > 0
      const glowColor = node.glowColor || node.color

      const visualProps = {
        color: node.color,
        emissiveColor: node.color,
        emissiveIntensity: parentExpanded ? 0.4 : hasChildren ? 0.25 : 0.15,
        metalness: node.metalness ?? (parentExpanded ? 0.9 : 0.5),
        roughness: node.roughness ?? (parentExpanded ? 0.1 : 0.4),
      }

      const hoverTargetScale = hovered && !isDraggingRef.current ? baseScale * 1.08 : baseScale
      const currentMeshScale = meshRef.current.scale.x
      if (Math.abs(currentMeshScale - hoverTargetScale) > 0.01) {
        const newScale = THREE.MathUtils.lerp(currentMeshScale, hoverTargetScale, delta * 8)
        meshRef.current.scale.setScalar(newScale)
      }

      if (parentExpanded && meshRef.current) {
        const pulse = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.005
        meshRef.current.scale.multiplyScalar(pulse)
      }

      if (hasChildren && !parentExpanded && meshRef.current) {
        const subtlePulse = 1 + Math.sin(state.clock.elapsedTime * 1.5 + node.id.length) * 0.008
        meshRef.current.scale.multiplyScalar(subtlePulse)
      }
    }
  })

  const handlePointerDown = (e: any) => {
    // Don't interfere if rotate mode is active
    if (isRotateMode) {
      return
    }

    console.log(`Pointer down on node: ${node.id}`)
    e.stopPropagation()

    // Set pointer capture to ensure this node receives all subsequent events
    e.target.setPointerCapture(e.pointerId)

    const worldPosition = groupRef.current
      ? groupRef.current.position
      : new THREE.Vector3(node.position.x, node.position.y, node.position.z)

    dragInfo.current.startClientX = e.clientX
    dragInfo.current.startClientY = e.clientY
    dragInfo.current.startNodePosition.copy(worldPosition)
    dragInfo.current.initialDistance = camera.position.distanceTo(worldPosition)
    dragInfo.current.originalNodeId = node.id // Remember which node started the drag

    const cameraDirection = new THREE.Vector3()
    camera.getWorldDirection(cameraDirection)
    dragInfo.current.plane.setFromNormalAndCoplanarPoint(cameraDirection, worldPosition)

    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2(
      (e.clientX / gl.domElement.clientWidth) * 2 - 1,
      -(e.clientY / gl.domElement.clientHeight) * 2 + 1,
    )
    raycaster.setFromCamera(mouse, camera)

    const intersectionPoint = new THREE.Vector3()
    if (raycaster.ray.intersectPlane(dragInfo.current.plane, intersectionPoint)) {
      dragInfo.current.offset.copy(intersectionPoint).sub(worldPosition)
    } else {
      dragInfo.current.offset.set(0, 0, 0)
    }
  }

  const handlePointerMove = (e: any) => {
    // Only process if we have pointer capture and buttons are pressed
    if (!e.buttons || !e.target.hasPointerCapture(e.pointerId)) return

    e.stopPropagation()

    if (!dragStarted.current) {
      const distance = Math.hypot(e.clientX - dragInfo.current.startClientX, e.clientY - dragInfo.current.startClientY)
      if (distance > 5) {
        dragStarted.current = true
        isDraggingRef.current = true
        onDragStart()
        gl.domElement.style.cursor = e.shiftKey ? "ns-resize" : "grabbing"
      }
    }

    if (isDraggingRef.current) {
      // Always use the original node ID that started the drag
      const targetNodeId = dragInfo.current.originalNodeId

      if (e.shiftKey) {
        const deltaY = e.clientY - dragInfo.current.startClientY
        const depthSensitivity = 0.08 // Updated from 0.05 to 0.08
        const depthDelta = deltaY * depthSensitivity
        const cameraToNode = new THREE.Vector3()
          .subVectors(dragInfo.current.startNodePosition, camera.position)
          .normalize()
        const newDistance = Math.max(1, dragInfo.current.initialDistance + depthDelta)
        const newPosition = camera.position.clone().add(cameraToNode.multiplyScalar(newDistance))
        onNodeDrag(targetNodeId, { x: newPosition.x, y: newPosition.y, z: newPosition.z })
      } else {
        const raycaster = new THREE.Raycaster()
        const mouse = new THREE.Vector2(
          (e.clientX / gl.domElement.clientWidth) * 2 - 1,
          -(e.clientY / gl.domElement.clientHeight) * 2 + 1,
        )
        raycaster.setFromCamera(mouse, camera)
        const intersectionPoint = new THREE.Vector3()
        if (raycaster.ray.intersectPlane(dragInfo.current.plane, intersectionPoint)) {
          const newPosition = intersectionPoint.sub(dragInfo.current.offset)
          onNodeDrag(targetNodeId, { x: newPosition.x, y: newPosition.y, z: newPosition.z })
        }
      }
    }
  }

  const handlePointerUp = (e: any) => {
    console.log(`Pointer up on node: ${node.id}, dragStarted: ${dragStarted.current}`)
    e.stopPropagation()

    // Only trigger click if this node started the interaction and no drag occurred
    if (!dragStarted.current && dragInfo.current.originalNodeId === node.id) {
      onClick(node)
    }

    // Clean up drag state
    isDraggingRef.current = false
    dragStarted.current = false
    dragInfo.current.originalNodeId = ""
    onDragEnd()

    // Release pointer capture
    if (e.target.hasPointerCapture(e.pointerId)) {
      e.target.releasePointerCapture(e.pointerId)
    }

    gl.domElement.style.cursor = hovered ? "grab" : "default"
  }

  const handlePointerOver = (e: any) => {
    // Don't show hover effects if rotate mode is active or if another node is being dragged
    if (isRotateMode || (isDraggingRef.current && dragInfo.current.originalNodeId !== node.id)) {
      return
    }

    e.stopPropagation()
    setHovered(true)
    gl.domElement.style.cursor = e.shiftKey ? "ns-resize" : "grab"
  }

  const handlePointerOut = () => {
    setHovered(false)
    if (!isDraggingRef.current) {
      gl.domElement.style.cursor = "default"
    }
  }

  const handleDoubleClick = (e: any) => {
    // Don't handle double-click in rotate mode
    if (isRotateMode) {
      return
    }

    console.log(`Double-click on node: ${node.id}`)
    e.stopPropagation()
    onDoubleClick(node)
  }

  return (
    <group ref={groupRef}>
      {/* Glow effect sphere */}
      <mesh scale={parentExpanded ? 0.72 : 0.56}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color={node.glowColor || node.color}
          transparent
          opacity={
            node.glowColor === "#FFD700"
              ? node.children && node.children.length > 0
                ? 0.8
                : 0.7
              : node.children && node.children.length > 0
                ? 0.35
                : 0.25
          }
          side={THREE.BackSide}
        />
      </mesh>

      {/* Main node sphere */}
      <mesh
        ref={meshRef}
        scale={parentExpanded ? 0.48 : 0.32}
        onDoubleClick={handleDoubleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color={node.color}
          emissive={node.color}
          emissiveIntensity={parentExpanded ? 0.4 : node.children && node.children.length > 0 ? 0.25 : 0.15}
          metalness={node.metalness ?? (parentExpanded ? 0.9 : 0.5)}
          roughness={node.roughness ?? (parentExpanded ? 0.1 : 0.4)}
          transparent
        />
      </mesh>

      {/* Node label (billboarded to face camera) */}
      <Billboard follow>
        <Html transform distanceFactor={10} position={[0, -0.6, 0]}>
          <div
            style={{
              pointerEvents: "none",
              display: parentExpanded ? "block" : "none",
            }}
            className={`text-white text-center font-bold text-sm px-2 py-1 rounded backdrop-blur-sm border ${node.children && node.children.length > 0 ? `border-2 border-opacity-60` : "bg-black/50 border-gray-500/30"}`}
          >
            {node.name}
          </div>
        </Html>
      </Billboard>

      {/* Expand/collapse indicator (billboarded to face camera) */}
      {node.children && node.children.length > 0 && (
        <Billboard follow>
          <Html transform distanceFactor={15} position={[0.7, 0.7, 0]}>
            <div
              style={{
                color: "white",
                fontSize: "18px",
                fontWeight: "bold",
                textShadow: "0 0 4px rgba(0,0,0,0.8)",
                pointerEvents: "none",
                backgroundColor: "rgba(0,0,0,0.5)",
                borderRadius: "50%",
                width: "24px",
                height: "24px",
                display: parentExpanded ? "flex" : "none",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {node.expanded ? "-" : "+"}
            </div>
          </Html>
        </Billboard>
      )}
    </group>
  )
}
