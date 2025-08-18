"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import type * as THREE from "three"

export function ParticleField() {
  const particlesRef = useRef<THREE.Points>(null)
  const particleCount = 200
  const positions = new Float32Array(particleCount * 3)

  // Define distance constraints to keep particles far from camera and nodes
  const minDistance = 15 // Minimum distance from origin
  const maxDistance = 35 // Maximum distance from origin

  for (let i = 0; i < particleCount; i++) {
    // Generate random spherical coordinates
    const theta = Math.random() * Math.PI * 2 // Azimuth angle
    const phi = Math.acos(2 * Math.random() - 1) // Polar angle (uniform distribution on sphere)
    const radius = minDistance + Math.random() * (maxDistance - minDistance) // Distance from origin

    // Convert spherical to cartesian coordinates
    const x = radius * Math.sin(phi) * Math.cos(theta)
    const y = radius * Math.sin(phi) * Math.sin(theta)
    const z = radius * Math.cos(phi)

    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z
  }

  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.05
    }
  })

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={particleCount} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial 
        color="#FFD700" 
        size={0.1} // Increased back to 0.1 as requested
        transparent 
        opacity={0.5} // Reduced opacity for more subtle background effect
        sizeAttenuation 
      />
    </points>
  )
}
