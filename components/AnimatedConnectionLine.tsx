"use client"

import { useRef, useState, useLayoutEffect } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { Position3D } from "../types/node"

interface AnimatedConnectionLineProps {
  start: Position3D
  end: Position3D
  color: string
  visible?: boolean
}

export function AnimatedConnectionLine({ start, end, color, visible = true }: AnimatedConnectionLineProps) {
  const lineRef = useRef<THREE.Line>(null)
  const [opacity, setOpacity] = useState(visible ? 0.6 : 0)

  // CRITICAL FIX: This effect runs whenever start or end points change,
  // forcing the line's geometry to update.
  useLayoutEffect(() => {
    if (lineRef.current) {
      const geometry = lineRef.current.geometry as THREE.BufferGeometry
      const positions = geometry.attributes.position as THREE.BufferAttribute
      // Update the two points of the line
      positions.setXYZ(0, start.x, start.y, start.z)
      positions.setXYZ(1, end.x, end.y, end.z)
      // Tell Three.js that the positions have been updated
      positions.needsUpdate = true
    }
  }, [start, end]) // Dependency array ensures this runs only when positions change

  // This effect handles the smooth fade-in/fade-out animation.
  useFrame((state, delta) => {
    const targetOpacity = visible ? 0.6 : 0
    if (Math.abs(opacity - targetOpacity) > 0.01) {
      const newOpacity = THREE.MathUtils.lerp(opacity, targetOpacity, delta * 4)
      setOpacity(newOpacity)

      if (lineRef.current && lineRef.current.material) {
        ;(lineRef.current.material as THREE.LineBasicMaterial).opacity = newOpacity
      }
    }
  })

  // The geometry is now just a template. The useLayoutEffect will keep it in sync.
  return (
    <line ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={2}
          array={new Float32Array([start.x, start.y, start.z, end.x, end.y, end.z])}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </line>
  )
}
