"use client"

import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { Suspense, useState, useCallback, useEffect, useRef } from "react"
import { NetworkScene } from "../components/NetworkScene"
import { DescriptionPanel } from "../components/DescriptionPanel"
import { BreadcrumbNavigation } from "../components/BreadcrumbNavigation"
import { InstructionsPanel } from "../components/InstructionsPanel"
import { ProtocolFilter } from "../components/ProtocolFilter"
import { useNodeOperations } from "../hooks/useNodeOperations"
import { initialNetworkState, createInitialNetworkState } from "../data/initialNetworkState"
import { repositionNodesWithCollisionDetection } from "../utils/collisionDetection"
import type { NetworkState, Node3D, Position3D } from "../types/node"
import { RotateCcw, Info, Minimize2, Maximize2 } from 'lucide-react'
import * as THREE from "three"

// Cache structure for storing different layout states
interface LayoutCache {
  [key: string]: {
    nodes: Node3D
    centerNode: Node3D
    timestamp: number
  }
}

export default function NodeNetworkApp() {
  const [networkState, setNetworkState] = useState<NetworkState>(initialNetworkState)
  const [isDragging, setIsDragging] = useState(false)
  // Track visual position of focused node in details mode
  const [focusedNodeVisualPosition, setFocusedNodeVisualPosition] = useState<Position3D | null>(null)
  // Track which node's details to show (separate from navigation focus)
  const [detailsNodeId, setDetailsNodeId] = useState<string>("center")
  // Protocol filter state
  const [selectedProtocols, setSelectedProtocols] = useState<string[]>([])
  // Income filter state
  const [selectedIncome, setSelectedIncome] = useState<string[]>([])
  // Search filter state
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [isFilterActive, setIsFilterActive] = useState(false)
  // Track if we need to reposition nodes after expansion/collapse
  const [needsRepositioning, setNeedsRepositioning] = useState(false)
  // Collapsed states for both panels - START WITH FILTER COLLAPSED
  const [isControlsCollapsed, setIsControlsCollapsed] = useState(false)
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(true) // Changed to true to start collapsed
  // Add after existing state declarations
  const [isAllExpanded, setIsAllExpanded] = useState(false)
  // Pan controls state
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null)
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  // Change from isPanMode to isRotateMode
  const [isRotateMode, setIsRotateMode] = useState(false)
  // Add Info mode state
  const [isInfoMode, setIsInfoMode] = useState(false)
  const [infoNodeId, setInfoNodeId] = useState<string | null>(null)
  // Track empty space interactions
  const [isEmptySpaceInteracting, setIsEmptySpaceInteracting] = useState(false)

  // Layout cache for storing different expansion states
  const layoutCacheRef = useRef<LayoutCache>({})
  const maxCacheSize = 10 // Limit cache size to prevent memory issues
  const orbitControlsRef = useRef<any>(null)

  const { findNodeById, buildBreadcrumbPath } = useNodeOperations()

  // Single spacing variable for consistent button spacing
  const BUTTON_SPACING = 8 // 8px gap between buttons (equivalent to gap-2 in Tailwind)

  // Generate cache key based on current state
  const generateCacheKey = useCallback((expanded: boolean, protocols: string[], income: string[], search: string): string => {
    const expandedKey = expanded ? "expanded" : "collapsed"
    const protocolsKey = protocols.length > 0 ? `protocols-${protocols.sort().join("-")}` : "no-protocols"
    const incomeKey = income.length > 0 ? `income-${income.sort().join("-")}` : "no-income"
    const searchKey = search.trim() ? `search-${search.trim().toLowerCase().replace(/\s+/g, "-")}` : "no-search"
    return `${expandedKey}-${protocolsKey}-${incomeKey}-${searchKey}`
  }, [])

  // Store layout in cache
  const cacheLayout = useCallback(
    (key: string, nodes: Node3D[], centerNode: Node3D) => {
      // Deep clone to avoid reference issues
      const cachedLayout = {
        nodes: structuredClone(nodes),
        centerNode: structuredClone(centerNode),
        timestamp: Date.now(),
      }

      layoutCacheRef.current[key] = cachedLayout

      // Limit cache size - remove oldest entries
      const cacheEntries = Object.entries(layoutCacheRef.current)
      if (cacheEntries.length > maxCacheSize) {
        // Sort by timestamp and remove oldest
        cacheEntries.sort((a, b) => a[1].timestamp - b[1].timestamp)
        const entriesToRemove = cacheEntries.slice(0, cacheEntries.length - maxCacheSize)
        entriesToRemove.forEach(([keyToRemove]) => {
          delete layoutCacheRef.current[keyToRemove]
        })
      }

      console.log(`Cached layout: ${key}`, Object.keys(layoutCacheRef.current))
    },
    [maxCacheSize],
  )

  // Retrieve layout from cache
  const getCachedLayout = useCallback((key: string): { nodes: Node3D[]; centerNode: Node3D } | null => {
    const cached = layoutCacheRef.current[key]
    if (cached) {
      console.log(`Retrieved cached layout: ${key}`)
      // Deep clone to avoid reference issues
      return {
        nodes: structuredClone(cached.nodes),
        centerNode: structuredClone(cached.centerNode),
      }
    }
    return null
  }, [])

  // Clear cache (useful when nodes are manually moved)
  const clearCache = useCallback(() => {
    layoutCacheRef.current = {}
    console.log("Layout cache cleared")
  }, [])

  // Effect to reposition nodes when needed
  useEffect(() => {
    if (needsRepositioning && isFilterActive) {
      setNetworkState((prev) => {
        const clonedNodes = structuredClone(prev.nodes)
        const clonedCenter = structuredClone(prev.centerNode)

        // Only reposition if filter is active
        repositionNodesWithCollisionDetection(clonedNodes, clonedCenter)

        // Cache the repositioned layout
        const cacheKey = generateCacheKey(isAllExpanded, selectedProtocols, selectedIncome, searchTerm)
        cacheLayout(cacheKey, clonedNodes, clonedCenter)

        return {
          ...prev,
          centerNode: clonedCenter,
          nodes: clonedNodes,
        }
      })
      setNeedsRepositioning(false)
    }
  }, [needsRepositioning, isFilterActive, cacheLayout, generateCacheKey, isAllExpanded, selectedProtocols, selectedIncome, searchTerm])

  // Function to expand all nodes recursively and reposition them
  const expandAllNodes = useCallback(
    (nodes: Node3D[], centerNode: Node3D): { nodes: Node3D[]; centerNode: Node3D } => {
      // Check cache first
      const cacheKey = generateCacheKey(true, selectedProtocols, selectedIncome, searchTerm)
      const cachedLayout = getCachedLayout(cacheKey)

      if (cachedLayout) {
        console.log("Using cached expanded layout")
        return cachedLayout
      }

      console.log("Computing new expanded layout")
      // Deep clone to avoid mutations
      const clonedNodes = structuredClone(nodes)
      const clonedCenter = structuredClone(centerNode)

      // Recursively expand all nodes
      function expandRecursively(nodeList: Node3D[]) {
        nodeList.forEach((node) => {
          node.expanded = true
          if (node.children) {
            expandRecursively(node.children)
          }
        })
      }

      clonedCenter.expanded = true
      expandRecursively(clonedNodes)

      // Reposition all nodes to avoid collisions
      repositionNodesWithCollisionDetection(clonedNodes, clonedCenter)

      // Cache the result
      cacheLayout(cacheKey, clonedNodes, clonedCenter)

      return { nodes: clonedNodes, centerNode: clonedCenter }
    },
    [generateCacheKey, getCachedLayout, cacheLayout, selectedProtocols, selectedIncome, searchTerm],
  )

  // Function to collapse all nodes
  const collapseAllNodes = useCallback(
    (nodes: Node3D[], centerNode: Node3D): { nodes: Node3D[]; centerNode: Node3D } => {
      // Check cache first
      const cacheKey = generateCacheKey(false, selectedProtocols, selectedIncome, searchTerm)
      const cachedLayout = getCachedLayout(cacheKey)

      if (cachedLayout) {
        console.log("Using cached collapsed layout")
        return cachedLayout
      }

      console.log("Computing new collapsed layout")
      const clonedNodes = structuredClone(nodes)
      const clonedCenter = structuredClone(centerNode)

      // Recursively collapse all nodes except center
      function collapseRecursively(nodeList: Node3D[]) {
        nodeList.forEach((node) => {
          node.expanded = false
          if (node.children) {
            collapseRecursively(node.children)
          }
        })
      }

      clonedCenter.expanded = true // Keep center expanded
      collapseRecursively(clonedNodes)

      // Cache the result
      cacheLayout(cacheKey, clonedNodes, clonedCenter)

      return { nodes: clonedNodes, centerNode: clonedCenter }
    },
    [generateCacheKey, getCachedLayout, cacheLayout, selectedProtocols, selectedIncome, searchTerm],
  )

  // Add after the expandAllNodes function
  const handleExpandAll = useCallback(() => {
    if (!isAllExpanded) {
      // Expand all nodes (with caching)
      const { nodes: expandedNodes, centerNode: expandedCenter } = expandAllNodes(
        networkState.nodes,
        networkState.centerNode,
      )
      setNetworkState((prev) => ({
        ...prev,
        centerNode: expandedCenter,
        nodes: expandedNodes,
      }))
      setIsAllExpanded(true)
    } else {
      // Close all - reset to initial collapsed state (with caching)
      const { nodes: collapsedNodes, centerNode: collapsedCenter } = collapseAllNodes(
        networkState.nodes,
        networkState.centerNode,
      )
      setNetworkState((prev) => ({
        ...prev,
        centerNode: collapsedCenter,
        nodes: collapsedNodes,
      }))
      setIsAllExpanded(false)
    }
  }, [isAllExpanded, expandAllNodes, collapseAllNodes, networkState.nodes, networkState.centerNode])

  const handleResetLayout = useCallback(() => {
    // Get a fresh, pristine copy of the network state
    const freshState = createInitialNetworkState()

    // Create a map of the current expansion states to preserve user interaction
    const expansionMap = new Map<string, boolean>()
    const collectExpansionStates = (node: Node3D) => {
      expansionMap.set(node.id, node.expanded)
      if (node.children) {
        node.children.forEach(collectExpansionStates)
      }
    }
    collectExpansionStates(networkState.centerNode)
    networkState.nodes.forEach(collectExpansionStates)

    // Apply the saved expansion states to the fresh layout
    const applyExpansionStates = (node: Node3D) => {
      if (expansionMap.has(node.id)) {
        node.expanded = expansionMap.get(node.id) ?? node.expanded
      }
      if (node.children) {
        node.children.forEach(applyExpansionStates)
      }
    }
    applyExpansionStates(freshState.centerNode)
    freshState.nodes.forEach(applyExpansionStates)

    // Reposition the nodes based on the applied expansion states
    repositionNodesWithCollisionDetection(freshState.nodes, freshState.centerNode)

    // Set the new, clean state
    setNetworkState(freshState)

    // Clear the layout cache as all manual positions are gone
    clearCache()

    // Reset pan offset
    setPanOffset({ x: 0, y: 0 })

    console.log("Layout has been reset to default positions.")
  }, [networkState, clearCache])

  // Pan control handlers - Updated logic
  const handlePanStart = useCallback(
    (clientX: number, clientY: number) => {
      // Only start panning if not already dragging a node
      if (!isDragging) {
        console.log("Starting pan")
        setIsPanning(true)
        setPanStart({ x: clientX, y: clientY })
      }
    },
    [isDragging],
  )

  const handlePanMove = useCallback(
    (clientX: number, clientY: number) => {
      if (isPanning && panStart) {
        const deltaX = clientX - panStart.x
        const deltaY = clientY - panStart.y

        // Convert screen space movement to world space (X,Y only)
        const sensitivity = 0.01
        const newOffset = {
          x: panOffset.x - deltaX * sensitivity,
          y: panOffset.y + deltaY * sensitivity, // Invert Y for natural feel
        }

        setPanOffset(newOffset)
        setPanStart({ x: clientX, y: clientY })
      }
    },
    [isPanning, panStart, panOffset],
  )

  const handlePanEnd = useCallback(() => {
    if (isPanning) {
      console.log("Ending pan")
      setIsPanning(false)
      setPanStart(null)
    }
  }, [])

  // Get the info node for info mode - MOVE THIS UP BEFORE getButtonRowPosition
  const infoNode = infoNodeId ? findNodeById(infoNodeId, networkState.nodes, networkState.centerNode) : null

  // Fixed button positioning calculation using consistent spacing
  const getButtonRowPosition = () => {
    // In info/details modes, both panels are always collapsed (forced to icon state)
    const inSpecialMode = networkState.isZoomedIn || infoNode
    
    if (inSpecialMode) {
      // Both panels are collapsed in info/details modes, so we have 2 icons (36px each)
      const iconWidth = 36
      const startPosition = 16 // left-4 = 16px
      
      // Calculate positions: startPos + (iconWidth + spacing) * 2 for first button after icons
      const afterIcons = startPosition + (iconWidth + BUTTON_SPACING) * 2
      
      return {
        expandAll: `left-[${afterIcons}px]`,
        reset: `left-[${afterIcons + iconWidth + BUTTON_SPACING}px]`,
        rotate: `left-[${afterIcons + (iconWidth + BUTTON_SPACING) * 2}px]`,
        info: `left-[${afterIcons + (iconWidth + BUTTON_SPACING) * 2 + 60 + BUTTON_SPACING}px]`, // 60px for rotate button width
        infoButtonEnd: afterIcons + (iconWidth + BUTTON_SPACING) * 2 + 60 + BUTTON_SPACING + 60, // Info button left + width
      }
    } else {
      // Normal overview mode - calculate based on actual panel states
      let iconSlots = 0
      if (isControlsCollapsed) iconSlots++
      if (isFilterCollapsed) iconSlots++
      
      const iconWidth = 36
      const startPosition = 16 // left-4 = 16px
      const afterIcons = iconSlots > 0 ? startPosition + (iconWidth + BUTTON_SPACING) * iconSlots : startPosition
      
      return {
        expandAll: `left-[${afterIcons}px]`,
        reset: `left-[${afterIcons + iconWidth + BUTTON_SPACING}px]`,
        rotate: `left-[${afterIcons + (iconWidth + BUTTON_SPACING) * 2}px]`,
        info: `left-[${afterIcons + (iconWidth + BUTTON_SPACING) * 2 + 60 + BUTTON_SPACING}px]`, // 60px for rotate button width
        infoButtonEnd: afterIcons + (iconWidth + BUTTON_SPACING) * 2 + 60 + BUTTON_SPACING + 60, // Info button left + width
      }
    }
  }

  const buttonPositions = getButtonRowPosition()

  // Calculate title position - centered or minimum spacing from info button
  const getTitlePosition = () => {
    const titleWidth = 320 // Approximate width for "WW METROPOLIS" at 36px font size
    const minSpacingFromInfo = buttonPositions.infoButtonEnd + BUTTON_SPACING
    
    // Calculate available width - full viewport or 60% when details/info panel is active
    const availableWidthPercent = (networkState.isZoomedIn || infoNode) ? 60 : 100
    const centeredPosition = `calc(${availableWidthPercent}vw / 2 - ${titleWidth / 2}px)`
    
    // Check if centered position would be too close to info button
    // We'll use CSS max() to ensure it's never closer than minimum spacing
    return `max(${minSpacingFromInfo}px, ${centeredPosition})`
  }

  // Handle filter activation/deactivation (now called automatically by ProtocolFilter)
  const handleToggleFilter = useCallback(() => {
    const newFilterActive = !isFilterActive
    setIsFilterActive(newFilterActive)

    if (newFilterActive) {
      // Only expand all nodes if not already expanded
      if (!isAllExpanded) {
        const { nodes: expandedNodes, centerNode: expandedCenter } = expandAllNodes(
          networkState.nodes,
          networkState.centerNode,
        )
        setNetworkState((prev) => ({
          ...prev,
          centerNode: expandedCenter,
          nodes: expandedNodes,
        }))
        // Set expand all state to trigger zoom out and update button text
        setIsAllExpanded(true)
        console.log("Filter activated - expanding all nodes")
      } else {
        console.log("Filter activated - nodes already expanded, skipping expansion")
      }
    }
    // Note: When deactivating filter, don't automatically collapse nodes
    // Let the user control that with the Expand All/Close All button
  }, [isFilterActive, isAllExpanded, expandAllNodes, networkState.nodes, networkState.centerNode])

  const handleNodeClick = useCallback(
    (clickedNode: Node3D) => {
      // Handle Info mode
      if (isInfoMode) {
        setInfoNodeId(clickedNode.id)
        // Camera centering will be handled by useEffect in NetworkScene
        return
      }

      // Update details panel if in details mode
      if (networkState.isZoomedIn) {
        setDetailsNodeId(clickedNode.id)
      }

      // Always allow expand/collapse functionality
      if (clickedNode.id === "center") {
        setNetworkState((prev) => {
          const newState = {
            ...prev,
            centerNode: { ...prev.centerNode, expanded: !prev.centerNode.expanded },
          }

          // Update cache with new expansion state instead of clearing
          const currentCacheKey = generateCacheKey(isAllExpanded, selectedProtocols, selectedIncome, searchTerm)
          cacheLayout(currentCacheKey, newState.nodes, newState.centerNode)

          return newState
        })

        // Trigger repositioning if filter is active
        if (isFilterActive) {
          setNeedsRepositioning(true)
        }
        return
      }

      setNetworkState((prev) => {
        const newState = structuredClone(prev)
        const targetNode = findNodeById(clickedNode.id, newState.nodes, newState.centerNode)
        if (targetNode) {
          targetNode.expanded = !targetNode.expanded
        }

        // Update cache with new expansion state instead of clearing
        const currentCacheKey = generateCacheKey(isAllExpanded, selectedProtocols, selectedIncome, searchTerm)
        cacheLayout(currentCacheKey, newState.nodes, newState.centerNode)

        return newState
      })

      // Trigger repositioning if filter is active
      if (isFilterActive) {
        setNeedsRepositioning(true)
      }
    },
    [
      findNodeById,
      networkState.isZoomedIn,
      isFilterActive,
      generateCacheKey,
      isAllExpanded,
      selectedProtocols,
      selectedIncome,
      searchTerm,
      cacheLayout,
      isInfoMode,
    ],
  )

  const handleNodeDrag = useCallback(
    (draggedNodeId: string, newPosition: Position3D) => {
      // If dragging focused node in details mode, only update visual position
      if (networkState.isZoomedIn && draggedNodeId === networkState.focusedNodeId) {
        setFocusedNodeVisualPosition(newPosition)
        return
      }

      setNetworkState((prev) => {
        const originalNode = findNodeById(draggedNodeId, prev.nodes, prev.centerNode)
        if (!originalNode) return prev

        const delta = {
          x: newPosition.x - originalNode.position.x,
          y: newPosition.y - originalNode.position.y,
          z: newPosition.z - originalNode.position.z,
        }

        if (Math.abs(delta.x) < 1e-5 && Math.abs(delta.y) < 1e-5 && Math.abs(delta.z) < 1e-5) {
          return prev
        }

        const newState = structuredClone(prev)
        const nodeToDrag = findNodeById(draggedNodeId, newState.nodes, newState.centerNode)

        if (nodeToDrag) {
          const storeRelativePositions = (node: Node3D, parentPos: Position3D): Map<string, Position3D> => {
            const relativePositions = new Map<string, Position3D>()

            if (node.children) {
              node.children.forEach((child) => {
                relativePositions.set(child.id, {
                  x: child.position.x - parentPos.x,
                  y: child.position.y - parentPos.y,
                  z: child.position.z - parentPos.z,
                })

                const childRelatives = storeRelativePositions(child, child.position)
                childRelatives.forEach((pos, id) => relativePositions.set(id, pos))
              })
            }

            return relativePositions
          }

          const applyPositionWithRelatives = (node: Node3D, newPos: Position3D, relatives: Map<string, Position3D>) => {
            node.position = { ...newPos }

            if (node.children) {
              node.children.forEach((child) => {
                const relative = relatives.get(child.id)
                if (relative) {
                  const childNewPos = {
                    x: newPos.x + relative.x,
                    y: newPos.y + relative.y,
                    z: newPos.z + relative.z,
                  }
                  applyPositionWithRelatives(child, childNewPos, relatives)
                }
              })
            }
          }

          const relativePositions = storeRelativePositions(nodeToDrag, originalNode.position)
          applyPositionWithRelatives(nodeToDrag, newPosition, relativePositions)
        }

        // Update cache with new positions instead of clearing it
        const currentCacheKey = generateCacheKey(isAllExpanded, selectedProtocols, selectedIncome, searchTerm)
        cacheLayout(currentCacheKey, newState.nodes, newState.centerNode)
        console.log(`Updated cache with manual positioning: ${currentCacheKey}`)

        return newState
      })
    },
    [findNodeById, networkState, generateCacheKey, isAllExpanded, selectedProtocols, selectedIncome, searchTerm, cacheLayout],
  )

  const handleNodeDoubleClick = useCallback(
    (node: Node3D) => {
      // In info mode, double-click should not change to details mode
      if (isInfoMode) {
        return
      }

      // Update details panel if in details mode
      if (networkState.isZoomedIn) {
        setDetailsNodeId(node.id)
      }

      // Clear visual position when switching focus
      setFocusedNodeVisualPosition(null)
      setNetworkState((prev) => ({
        ...prev,
        focusedNodeId: node.id,
        isZoomedIn: true,
        breadcrumbs: buildBreadcrumbPath(node.id, prev.nodes, prev.centerNode),
      }))

      // Set details to show the double-clicked node
      setDetailsNodeId(node.id)
      
      // Center camera on the selected node (one-time, not locked)
      // This will be handled by the useEffect in NetworkScene
    },
    [buildBreadcrumbPath, networkState.isZoomedIn, isInfoMode],
  )

  const handleBreadcrumbClick = useCallback((targetId: string, index: number) => {
    // Clear visual position when navigating
    setFocusedNodeVisualPosition(null)
    setNetworkState((prev) => ({
      ...prev,
      focusedNodeId: targetId,
      isZoomedIn: true,
      breadcrumbs: prev.breadcrumbs.slice(0, index + 1),
    }))
    // Update details to show the breadcrumb node
    setDetailsNodeId(targetId)
  }, [])

  const handleOverviewClick = useCallback(() => {
    // Clear visual position when returning to overview
    setFocusedNodeVisualPosition(null)
    setNetworkState((prev) => ({ ...prev, isZoomedIn: false, focusedNodeId: "center" }))
    // Reset details to center
    setDetailsNodeId("center")
  }, [])

  const handleCloseInfo = useCallback(() => {
    setInfoNodeId(null)
    setIsInfoMode(false)
  }, [])

  const handleEmptySpaceInteraction = useCallback((isInteracting: boolean) => {
    setIsEmptySpaceInteracting(isInteracting)
  }, [])

  const focusedNode = networkState.isZoomedIn
    ? findNodeById(networkState.focusedNodeId, networkState.nodes, networkState.centerNode)
    : null

  // Get the node whose details should be shown (may be different from focused node)
  const detailsNode = networkState.isZoomedIn
    ? findNodeById(detailsNodeId, networkState.nodes, networkState.centerNode)
    : null

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WW%20CoinDissolve%20v3-kvVPeVin0qq1gvPJKAyNLBF32PspMz.png')",
        }}
      />
      <div className="flex h-full">
        <div className={`${networkState.isZoomedIn || infoNode ? "w-3/5" : "w-full"} relative`}>
          
          <Canvas camera={{ position: [8, 8, 8], fov: 60 }} gl={{ alpha: true, antialias: true }}>
            <Suspense fallback={null}>
              <NetworkScene
                networkState={networkState}
                focusedNodeVisualPosition={focusedNodeVisualPosition}
                onNodeClick={handleNodeClick}
                onNodeDoubleClick={handleNodeDoubleClick}
                onNodeDrag={handleNodeDrag}
                onDragStart={() => setIsDragging(true)}
                onDragEnd={() => setIsDragging(false)}
                findNodeById={findNodeById}
                isAllExpanded={isAllExpanded}
                selectedProtocols={selectedProtocols}
                selectedIncome={selectedIncome}
                searchTerm={searchTerm}
                panOffset={panOffset}
                onPanStart={handlePanStart}
                onPanMove={handlePanMove}
                onPanEnd={handlePanEnd}
                isPanning={isPanning}
                infoNodeId={infoNodeId}
                detailsNodeId={networkState.isZoomedIn ? detailsNodeId : null}
                onEmptySpaceInteraction={handleEmptySpaceInteraction}
              />
            </Suspense>
            <OrbitControls
              ref={orbitControlsRef}
              enabled={!isDragging || isEmptySpaceInteracting} // Enable when empty space interaction is active
              target={[0, 0, 0]}
              enablePan={true}
              enableRotate={isRotateMode}
              enableZoom={true}
              mouseButtons={{
                LEFT: isRotateMode ? THREE.MOUSE.ROTATE : null,
                MIDDLE: THREE.MOUSE.DOLLY,
                RIGHT: THREE.MOUSE.PAN,
              }}
              makeDefault
            />
          </Canvas>
          
          {/* Always show all buttons */}
          <>
            {/* Controls Icon/Panel - Force collapsed in info/details modes */}
            <InstructionsPanel
              isCollapsed={networkState.isZoomedIn || infoNode ? true : isControlsCollapsed}
              onToggleCollapsed={networkState.isZoomedIn || infoNode ? () => {} : setIsControlsCollapsed}
              isFilterCollapsed={networkState.isZoomedIn || infoNode ? true : isFilterCollapsed}
            />

            {/* Filter Icon/Panel - Force collapsed in info/details modes */}
            <ProtocolFilter
              selectedProtocols={selectedProtocols}
              onProtocolsChange={setSelectedProtocols}
              selectedIncome={selectedIncome}
              onIncomeChange={setSelectedIncome}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              isActive={isFilterActive}
              onToggleFilter={handleToggleFilter}
              isCollapsed={networkState.isZoomedIn || infoNode ? true : isFilterCollapsed}
              onToggleCollapsed={networkState.isZoomedIn || infoNode ? () => {} : setIsFilterCollapsed}
              isControlsCollapsed={networkState.isZoomedIn || infoNode ? true : isControlsCollapsed}
              style={{ top: !isControlsCollapsed ? '356px' : '81px' }}
            />

            {/* Expand All Button - Icon only */}
            <button
              onClick={handleExpandAll}
              className={`absolute top-4 ${buttonPositions.expandAll} p-2 bg-amber-500/20 border border-amber-500/50 text-amber-300 rounded hover:bg-amber-500/30 transition-all duration-200 font-medium text-xs flex items-center justify-center`}
              title={isAllExpanded ? "Close All Nodes" : "Expand All Nodes"}
              style={{ width: "36px", height: "36px" }}
            >
              {isAllExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            {/* Reset Layout Button - Icon only */}
            <button
              onClick={handleResetLayout}
              className={`absolute top-4 ${buttonPositions.reset} p-2 bg-blue-500/20 border border-blue-500/50 text-blue-300 rounded hover:bg-blue-500/30 transition-all duration-200 font-medium text-xs flex items-center justify-center`}
              title="Reset Node Positions"
              style={{ width: "36px", height: "36px" }}
            >
              <RotateCcw size={16} />
            </button>

            {/* Rotate Button */}
            <button
              onClick={() => setIsRotateMode(!isRotateMode)}
              className={`absolute top-4 ${buttonPositions.rotate} p-2 ${
                isRotateMode
                  ? "bg-green-500/30 border-green-500/50 text-green-300"
                  : "bg-gray-500/20 border-gray-500/50 text-gray-300"
              } rounded hover:bg-opacity-40 transition-all duration-200 font-medium text-xs`}
              title={isRotateMode ? "Disable Rotate Mode" : "Enable Rotate Mode"}
              style={{ width: "60px", height: "36px" }}
            >
              Rotate
            </button>

            {/* Info Button */}
            <button
              onClick={() => {
                if (!isInfoMode) {
                  // Activating info mode - check if panels are already open
                  const panelAlreadyOpen = networkState.isZoomedIn || infoNode
                  if (!panelAlreadyOpen) {
                    setIsInfoMode(true)
                  } else {
                    // Panel already open, just activate info mode without opening new panel
                    setIsInfoMode(true)
                  }
                } else {
                  // Deactivating info mode - close all panels
                  setIsInfoMode(false)
                  setInfoNodeId(null)
                  // Also close details panel if open
                  if (networkState.isZoomedIn) {
                    handleOverviewClick()
                  }
                }
              }}
              className={`absolute top-4 ${buttonPositions.info} p-2 ${
                isInfoMode
                  ? "bg-purple-500/30 border-purple-500/50 text-purple-300"
                  : "bg-gray-500/20 border-gray-500/50 text-gray-300"
              } rounded hover:bg-opacity-40 transition-all duration-200 font-medium text-xs flex items-center justify-center gap-2`}
              title={isInfoMode ? "Disable Info Mode" : "Enable Info Mode"}
              style={{ width: "60px", height: "36px" }}
            >
              <Info size={14} />
              Info
            </button>

            {/* WW METROPOLIS Title - Centered or minimum spacing from Info button */}
            <div
              className="absolute top-4 flex items-center justify-center text-amber-500 font-bold tracking-wider"
              style={{ 
                height: "36px", 
                fontSize: "36px", 
                lineHeight: "36px",
                left: getTitlePosition()
              }}
            >
              WW METROPOLIS
            </div>
          </>
          
          {networkState.isZoomedIn && (
            <div className="absolute top-15 left-4 right-4 z-10">
              <BreadcrumbNavigation
                breadcrumbs={networkState.breadcrumbs}
                onOverviewClick={handleOverviewClick}
                onBreadcrumbClick={handleBreadcrumbClick}
              />
            </div>
          )}
        </div>
        {networkState.isZoomedIn && detailsNode && (
          <div className="w-2/5">
            <DescriptionPanel node={detailsNode} onClose={handleOverviewClick} />
          </div>
        )}
        {infoNode && (
          <div className="w-2/5">
            <DescriptionPanel node={infoNode} onClose={handleCloseInfo} />
          </div>
        )}
      </div>
      {/* Ensure target stays at hub */}
      {useEffect(() => {
        if (orbitControlsRef.current) {
          orbitControlsRef.current.target.set(0, 0, 0)
          orbitControlsRef.current.update()
        }
      }, [networkState, isAllExpanded])}
    </div>
  )
}
