"use client"

import { Settings } from 'lucide-react'
import { Card } from "@/components/ui/card"

interface InstructionsPanelProps {
  isCollapsed: boolean
  onToggleCollapsed: (collapsed: boolean) => void
  isFilterCollapsed: boolean
}

export function InstructionsPanel({ isCollapsed, onToggleCollapsed, isFilterCollapsed }: InstructionsPanelProps) {
  // Calculate position based on states
  const getPosition = () => {
    if (isCollapsed && isFilterCollapsed) {
      // Both collapsed: Controls icon at left-4 (first position)
      return "top-4 left-4"
    } else if (isCollapsed) {
      // Only controls collapsed: Controls icon at left-4 (first position)
      return "top-4 left-4"
    } else if (isFilterCollapsed) {
      // Only filter collapsed: Controls box below the icon row
      return "top-15 left-4"
    } else {
      // Both expanded: Controls box below the icon row
      return "top-15 left-4"
    }
  }

  if (isCollapsed) {
    return (
      <button
        onClick={() => onToggleCollapsed(false)}
        className={`absolute ${getPosition()} p-2 bg-black/70 text-amber-300 border border-amber-500/50 rounded hover:bg-black/80 transition-colors`}
        title="Show Controls"
        style={{ width: "36px", height: "36px" }}
      >
        <Settings size={16} />
      </button>
    )
  }

  return (
    <Card className={`absolute ${getPosition()} p-3 bg-black/70 text-white border-amber-500/50 w-72`} style={{ height: "280px" }}>
      <div className="flex items-center mb-2">
        <h3 className="font-bold text-sm">3D Node Network Controls</h3>
        <button
          onClick={() => onToggleCollapsed(true)}
          className="p-1 text-amber-300 hover:bg-amber-500/20 rounded transition-colors"
          title="Hide Controls"
          style={{ marginLeft: "10px" }}
        >
          <Settings size={14} />
        </button>
      </div>
      <ul className="text-xs space-y-1">
        <li>• **Drag Node**: Move node and its children</li>
        <li>• **Shift + Drag**: Move node closer/farther from camera</li>
        <li>• **Mouse Scroll**: Zoom in and out (always active)</li>
        <li>• **Right Click + Drag**: Pan view (always active)</li>
        <li>• **Rotate Mode**: Click "Rotate" button for left-click rotation</li>
        <li>• **Click**: Expand/collapse node connections</li>
        <li>• **Double-click**: Focus on node with details</li>
      </ul>
    </Card>
  )
}
