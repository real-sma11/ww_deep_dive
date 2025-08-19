"use client"

import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { Suspense, useState, useCallback, useRef } from "react"
import { NetworkScene } from "../components/NetworkScene"
import { DescriptionPanel } from "../components/DescriptionPanel"
import { BreadcrumbNavigation } from "../components/BreadcrumbNavigation"
import { InstructionsPanel } from "../components/InstructionsPanel"
import { ProtocolFilter } from "../components/ProtocolFilter"
import { useNodeOperations } from "../hooks/useNodeOperations"
import { initialNetworkState, createInitialNetworkState } from "../data/initialNetworkState"
import { repositionNodesWithCollisionDetection } from "../utils/collisionDetection"
import type { NetworkState, Node3D, Position3D } from "../types/node"
import { RotateCcw, Info, Minimize2, Maximize2 } from "lucide-react"
import * as THREE from "three"

interface LayoutCache {
  [key: string]: {
    nodes: Node3D[]
    centerNode: Node3D
    timestamp: number
  }
}

const NodeNetworkApp = () => {
  const [networkState, setNetworkState] = useState<NetworkState>(initialNetworkState)
  const [isDragging, setIsDragging] = useState(false)
  const [detailsNodeId, setDetailsNodeId] = useState<string>("center")
  const [infoNodeId, setInfoNodeId] = useState<string | null>(null)
  const [selectedProtocols, setSelectedProtocols] = useState<string[]>([])
  const [selectedIncome, setSelectedIncome] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [isFilterActive, setIsFilterActive] = useState(false)
  const [isControlsCollapsed, setIsControlsCollapsed] = useState(false)
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(true)
  const [isAllExpanded, setIsAllExpanded] = useState(false)
  const [isRotateMode, setIsRotateMode] = useState(false)
  const [isInfoMode, setIsInfoMode] = useState(false)

  const layoutCacheRef = useRef<LayoutCache>({})
  const maxCacheSize = 10
  const orbitControlsRef = useRef<any>(null)
  const isDraggingAnyNodeRef = useRef(false)

  const { findNodeById, buildBreadcrumbPath } = useNodeOperations()

  const BUTTON_SPACING = 8

  const generateCacheKey = useCallback(
    (expanded: boolean, protocols: string[], income: string[], search: string): string => {
      const expandedKey = expanded ? "expanded" : "collapsed"
      const protocolsKey = protocols.length > 0 ? `protocols-${protocols.sort().join("-")}` : "no-protocols"
      const incomeKey = income.length > 0 ? `income-${income.sort().join("-")}` : "no-income"
      const searchKey = search.trim() ? `search-${search.trim().toLowerCase().replace(/\s+/g, "-")}` : "no-search"
      return `${expandedKey}-${protocolsKey}-${incomeKey}-${searchKey}`
    },
    [],
  )

  const cacheLayout = useCallback(
    (key: string, nodes: Node3D[], centerNode: Node3D) => {
      const cachedLayout = {
        nodes: structuredClone(nodes),
        centerNode: structuredClone(centerNode),
        timestamp: Date.now(),
      }

      layoutCacheRef.current[key] = cachedLayout

      const cacheEntries = Object.entries(layoutCacheRef.current)
      if (cacheEntries.length > maxCacheSize) {
        cacheEntries.sort((a, b) => a[1].timestamp - b[1].timestamp)
        const entriesToRemove = cacheEntries.slice(0, cacheEntries.length - maxCacheSize)
        entriesToRemove.forEach(([keyToRemove]) => {
          delete layoutCacheRef.current[keyToRemove]
        })
      }
    },
    [maxCacheSize],
  )

  const getCachedLayout = useCallback((key: string): { nodes: Node3D[]; centerNode: Node3D } | null => {
    const cached = layoutCacheRef.current[key]
    if (cached) {
      return {
        nodes: structuredClone(cached.nodes),
        centerNode: structuredClone(cached.centerNode),
      }
    }
    return null
  }, [])

  const clearCache = useCallback(() => {
    layoutCacheRef.current = {}
  }, [])

  const expandAllNodes = useCallback(
    (nodes: Node3D[], centerNode: Node3D): { nodes: Node3D[]; centerNode: Node3D } => {
      const cacheKey = generateCacheKey(true, selectedProtocols, selectedIncome, searchTerm)
      const cachedLayout = getCachedLayout(cacheKey)

      if (cachedLayout) {
        return cachedLayout
      }

      const clonedNodes = structuredClone(nodes)
      const clonedCenter = structuredClone(centerNode)

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

      const originalCenterPosition = { ...clonedCenter.position }
      repositionNodesWithCollisionDetection(clonedNodes, clonedCenter)
      clonedCenter.position = originalCenterPosition

      cacheLayout(cacheKey, clonedNodes, clonedCenter)

      return { nodes: clonedNodes, centerNode: clonedCenter }
    },
    [generateCacheKey, getCachedLayout, cacheLayout, selectedProtocols, selectedIncome, searchTerm],
  )

  const collapseAllNodes = useCallback(
    (nodes: Node3D[], centerNode: Node3D): { nodes: Node3D[]; centerNode: Node3D } => {
      const cacheKey = generateCacheKey(false, selectedProtocols, selectedIncome, searchTerm)
      const cachedLayout = getCachedLayout(cacheKey)

      if (cachedLayout) {
        return cachedLayout
      }

      const clonedNodes = structuredClone(nodes)
      const clonedCenter = structuredClone(centerNode)

      function collapseRecursively(nodeList: Node3D[]) {
        nodeList.forEach((node) => {
          node.expanded = false
          if (node.children) {
            collapseRecursively(node.children)
          }
        })
      }

      clonedCenter.expanded = true
      collapseRecursively(clonedNodes)

      clonedCenter.position = { x: 0, y: 0, z: 0 }
      cacheLayout(cacheKey, clonedNodes, clonedCenter)

      return { nodes: clonedNodes, centerNode: clonedCenter }
    },
    [generateCacheKey, getCachedLayout, cacheLayout, selectedProtocols, selectedIncome, searchTerm],
  )

  const handleExpandAll = useCallback(() => {
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
      setIsAllExpanded(true)
    } else {
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
    const freshState = createInitialNetworkState()

    const expansionMap = new Map<string, boolean>()
    const collectExpansionStates = (node: Node3D) => {
      expansionMap.set(node.id, node.expanded)
      if (node.children) {
        node.children.forEach(collectExpansionStates)
      }
    }
    collectExpansionStates(networkState.centerNode)
    networkState.nodes.forEach(collectExpansionStates)

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

    repositionNodesWithCollisionDetection(freshState.nodes, freshState.centerNode)

    setNetworkState(freshState)
    clearCache()
  }, [networkState, clearCache])

  const getButtonRowPosition = () => {
    const inSpecialMode = networkState.isZoomedIn || infoNodeId

    if (inSpecialMode) {
      const iconWidth = 36
      const startPosition = 16
      const afterIcons = startPosition + (iconWidth + BUTTON_SPACING) * 2

      return {
        expandAll: `left-[${afterIcons}px]`,
        reset: `left-[${afterIcons + iconWidth + BUTTON_SPACING}px]`,
        rotate: `left-[${afterIcons + (iconWidth + BUTTON_SPACING) * 2}px]`,
        info: `left-[${afterIcons + (iconWidth + BUTTON_SPACING) * 2 + 60 + BUTTON_SPACING}px]`,
        infoButtonEnd: afterIcons + (iconWidth + BUTTON_SPACING) * 2 + 60 + BUTTON_SPACING + 60,
      }
    } else {
      let iconSlots = 0
      if (isControlsCollapsed) iconSlots++
      if (isFilterCollapsed) iconSlots++

      const iconWidth = 36
      const startPosition = 16
      const afterIcons = iconSlots > 0 ? startPosition + (iconWidth + BUTTON_SPACING) * iconSlots : startPosition

      return {
        expandAll: `left-[${afterIcons}px]`,
        reset: `left-[${afterIcons + iconWidth + BUTTON_SPACING}px]`,
        rotate: `left-[${afterIcons + (iconWidth + BUTTON_SPACING) * 2}px]`,
        info: `left-[${afterIcons + (iconWidth + BUTTON_SPACING) * 2 + 60 + BUTTON_SPACING}px]`,
        infoButtonEnd: afterIcons + (iconWidth + BUTTON_SPACING) * 2 + 60 + BUTTON_SPACING + 60,
      }
    }
  }

  const buttonPositions = getButtonRowPosition()

  const getTitlePosition = () => {
    const titleWidth = 320
    const minSpacingFromInfo = buttonPositions.infoButtonEnd + BUTTON_SPACING
    const availableWidthPercent = networkState.isZoomedIn || infoNodeId ? 60 : 100
    const centeredPosition = `calc(${availableWidthPercent}vw / 2 - ${titleWidth / 2}px)`
    return `max(${minSpacingFromInfo}px, ${centeredPosition})`
  }

  const handleToggleFilter = useCallback(() => {
    const newFilterActive = !isFilterActive
    setIsFilterActive(newFilterActive)

    if (newFilterActive) {
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
        setIsAllExpanded(true)
      }
    }
  }, [isFilterActive, isAllExpanded, expandAllNodes, networkState.nodes, networkState.centerNode])

  const handleNodeClick = useCallback(
    (clickedNode: Node3D) => {
      if (isInfoMode) {
        setInfoNodeId(clickedNode.id)
        // Also handle the expand/collapse functionality in info mode
        if (clickedNode.id === "center") {
          setNetworkState((prev) => ({
            ...prev,
            centerNode: { ...prev.centerNode, expanded: !prev.centerNode.expanded },
          }))
        } else {
          setNetworkState((prev) => {
            const newState = structuredClone(prev)
            const targetNode = findNodeById(clickedNode.id, newState.nodes, newState.centerNode)
            if (targetNode) {
              targetNode.expanded = !targetNode.expanded
            }
            return newState
          })
        }
        return
      }

      // In details mode, also update the details node
      if (networkState.isZoomedIn) {
        setDetailsNodeId(clickedNode.id)
      }

      if (clickedNode.id === "center") {
        setNetworkState((prev) => ({
          ...prev,
          centerNode: { ...prev.centerNode, expanded: !prev.centerNode.expanded },
        }))
        return
      }

      setNetworkState((prev) => {
        const newState = structuredClone(prev)
        const targetNode = findNodeById(clickedNode.id, newState.nodes, newState.centerNode)
        if (targetNode) {
          targetNode.expanded = !targetNode.expanded
        }
        return newState
      })
    },
    [findNodeById, isInfoMode, networkState.isZoomedIn],
  )

  const handleNodeDoubleClick = useCallback(
    (node: Node3D) => {
      // If we're already in details mode and double-clicking the same focused node, just recenter
      if (networkState.isZoomedIn && node.id === networkState.focusedNodeId) {
        setNetworkState((prev) => ({
          ...prev,
          focusedNodeId: node.id + "_temp",
        }))

        setTimeout(() => {
          setNetworkState((prev) => ({
            ...prev,
            focusedNodeId: node.id,
          }))
        }, 0)

        return
      }

      // Close info mode if it's open
      if (infoNodeId) {
        setInfoNodeId(null)
        setIsInfoMode(false)
      }

      // Enter details mode - zoom in on the double-clicked node
      setNetworkState((prev) => ({
        ...prev,
        focusedNodeId: node.id,
        isZoomedIn: true,
        breadcrumbs: buildBreadcrumbPath(node.id, prev.nodes, prev.centerNode),
      }))

      setDetailsNodeId(node.id)
    },
    [buildBreadcrumbPath, infoNodeId, networkState.isZoomedIn, networkState.focusedNodeId],
  )

  const handleBreadcrumbClick = useCallback((targetId: string, index: number) => {
    setNetworkState((prev) => ({
      ...prev,
      focusedNodeId: targetId,
      isZoomedIn: true,
      breadcrumbs: prev.breadcrumbs.slice(0, index + 1),
    }))
    setDetailsNodeId(targetId)
  }, [])

  const handleOverviewClick = useCallback(() => {
    setNetworkState((prev) => ({ ...prev, isZoomedIn: false, focusedNodeId: "center" }))
    setDetailsNodeId("center")
  }, [])

  const handleCloseInfo = useCallback(() => {
    setInfoNodeId(null)
    setIsInfoMode(false)
  }, [])

  const handleNodeDrag = useCallback(
    (draggedNodeId: string, newPosition: Position3D) => {
      if (!isDraggingAnyNodeRef.current) {
        isDraggingAnyNodeRef.current = true
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

        return newState
      })
    },
    [findNodeById],
  )

  const infoNode = infoNodeId ? findNodeById(infoNodeId, networkState.nodes, networkState.centerNode) : null
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
                onNodeClick={handleNodeClick}
                onNodeDoubleClick={handleNodeDoubleClick}
                onNodeDrag={handleNodeDrag}
                onDragStart={() => {
                  setIsDragging(true)
                  isDraggingAnyNodeRef.current = true
                }}
                onDragEnd={() => {
                  setIsDragging(false)
                  setTimeout(() => {
                    isDraggingAnyNodeRef.current = false
                  }, 100)
                }}
                findNodeById={findNodeById}
                isAllExpanded={isAllExpanded}
                selectedProtocols={selectedProtocols}
                selectedIncome={selectedIncome}
                searchTerm={searchTerm}
                infoNodeId={infoNodeId}
                detailsNodeId={networkState.isZoomedIn ? detailsNodeId : null}
                controlsInteracting={false}
                isRotateMode={isRotateMode}
              />
            </Suspense>
            <OrbitControls
              ref={orbitControlsRef}
              enabled={!isDragging}
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

          <InstructionsPanel
            isCollapsed={networkState.isZoomedIn || infoNode ? true : isControlsCollapsed}
            onToggleCollapsed={networkState.isZoomedIn || infoNode ? () => {} : setIsControlsCollapsed}
            isFilterCollapsed={networkState.isZoomedIn || infoNode ? true : isFilterCollapsed}
          />

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
          />

          <button
            onClick={handleExpandAll}
            className={`absolute top-4 ${buttonPositions.expandAll} p-2 bg-amber-500/20 border border-amber-500/50 text-amber-300 rounded hover:bg-amber-500/30 transition-all duration-200 font-medium text-xs flex items-center justify-center`}
            title={isAllExpanded ? "Close All Nodes" : "Expand All Nodes"}
            style={{ width: "36px", height: "36px" }}
          >
            {isAllExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          <button
            onClick={handleResetLayout}
            className={`absolute top-4 ${buttonPositions.reset} p-2 bg-blue-500/20 border border-blue-500/50 text-blue-300 rounded hover:bg-blue-500/30 transition-all duration-200 font-medium text-xs flex items-center justify-center`}
            title="Reset Node Positions"
            style={{ width: "36px", height: "36px" }}
          >
            <RotateCcw size={16} />
          </button>

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

          <button
            onClick={() => {
              if (!isInfoMode) {
                setIsInfoMode(true)
              } else {
                setIsInfoMode(false)
                setInfoNodeId(null)
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

          <div
            className="absolute top-4 flex items-center justify-center text-amber-500 font-bold tracking-wider"
            style={{
              height: "36px",
              fontSize: "36px",
              lineHeight: "36px",
              left: getTitlePosition(),
            }}
          >
            WW METROPOLIS
          </div>

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

        {networkState.isZoomedIn && detailsNode && !infoNode && (
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
    </div>
  )
}

export default NodeNetworkApp
