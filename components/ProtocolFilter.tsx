"use client"

import type React from "react"

import { useState } from "react"
import { FilterIcon } from 'lucide-react'
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { nodeDescriptions } from "../data/nodeDescriptions"

interface ProtocolFilterProps {
  selectedProtocols: string[]
  onProtocolsChange: (protocols: string[]) => void
  selectedIncome: string[]
  onIncomeChange: (income: string[]) => void
  searchTerm: string
  onSearchChange: (term: string) => void
  isActive: boolean
  onToggleFilter: () => void
  isCollapsed: boolean
  onToggleCollapsed: (collapsed: boolean) => void
  isControlsCollapsed: boolean
}

export function ProtocolFilter({
  selectedProtocols,
  onProtocolsChange,
  selectedIncome,
  onIncomeChange,
  searchTerm,
  onSearchChange,
  isActive,
  onToggleFilter,
  isCollapsed,
  onToggleCollapsed,
  isControlsCollapsed,
}: ProtocolFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Get all unique protocols from all nodes
  const allProtocols = Array.from(
    new Set(
      Object.values(nodeDescriptions)
        .flatMap((node) => node.protocols || [])
        .sort(),
    ),
  )

  // Get all unique income types
  const allIncomeTypes = ["None", "Project", "Investors", "Creators"]

  const handleIncomeToggle = (incomeType: string) => {
    let newIncome: string[]
    if (selectedIncome.includes(incomeType)) {
      newIncome = selectedIncome.filter((i) => i !== incomeType)
    } else {
      newIncome = [...selectedIncome, incomeType]
    }

    onIncomeChange(newIncome)

    // Auto-activate/deactivate filter based on selection or search
    const shouldBeActive = newIncome.length > 0 || selectedProtocols.length > 0 || searchTerm.trim().length > 0
    if (shouldBeActive !== isActive) {
      onToggleFilter()
    }
  }

  const handleProtocolToggle = (protocol: string) => {
    let newProtocols: string[]
    if (selectedProtocols.includes(protocol)) {
      newProtocols = selectedProtocols.filter((p) => p !== protocol)
    } else {
      newProtocols = [...selectedProtocols, protocol]
    }

    onProtocolsChange(newProtocols)

    // Auto-activate/deactivate filter based on selection or search
    const shouldBeActive = newProtocols.length > 0 || searchTerm.trim().length > 0 || selectedIncome.length > 0
    if (shouldBeActive !== isActive) {
      onToggleFilter()
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value
    onSearchChange(term)

    // Auto-activate/deactivate filter based on search, protocol selection, or income selection
    const shouldBeActive = term.trim().length > 0 || selectedProtocols.length > 0 || selectedIncome.length > 0
    if (shouldBeActive !== isActive) {
      onToggleFilter()
    }
  }

  const handleSelectAll = () => {
    onProtocolsChange(allProtocols)
    onIncomeChange(allIncomeTypes)
    if (!isActive) {
      onToggleFilter()
    }
  }

  const handleClearAll = () => {
    onProtocolsChange([])
    onIncomeChange([])
    onSearchChange("")
    if (isActive) {
      onToggleFilter()
    }
  }

  const totalFiltersActive = selectedProtocols.length + selectedIncome.length + (searchTerm.trim().length > 0 ? 1 : 0)

  // Calculate position based on states with proper spacing
  const getPosition = () => {
    if (isCollapsed && isControlsCollapsed) {
      // Both collapsed: Filter icon at left-15 (second position in icon row)
      return "left-15"
    } else if (isCollapsed && !isControlsCollapsed) {
      // Only filter collapsed, controls expanded: Filter icon should move to far left to make room for controls
      return "left-4" // Move to far left when controls panel is expanded
    } else if (!isCollapsed && isControlsCollapsed) {
      // Only controls collapsed, filter expanded: Filter box below the icon row
      return "left-4"
    } else {
      // Both expanded: Filter box below the controls box
      return "left-4"
    }
  }

  // Calculate top position separately for better control
  const getTopPosition = () => {
    if (isCollapsed && isControlsCollapsed) {
      return "top-4"
    } else if (isCollapsed && !isControlsCollapsed) {
      // When filter is collapsed but controls are expanded, filter button should go to button row
      return "top-4" // Should be in the button row
    } else if (!isCollapsed && isControlsCollapsed) {
      return "top-15"
    } else {
      return "top-[312px]" // 60px (top-15) + 280px (controls height) + 16px spacing = 356px, using 312px for better fit
    }
  }

  if (isCollapsed) {
    return (
      <button
        onClick={() => onToggleCollapsed(false)}
        className={`absolute ${getTopPosition()} ${getPosition()} p-2 bg-black/80 text-amber-300 border border-amber-500/50 rounded hover:bg-black/90 transition-colors`}
        title="Show Filter"
        style={{ width: "36px", height: "36px" }}
      >
        <FilterIcon size={16} />
        {totalFiltersActive > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-black text-xs rounded-full flex items-center justify-center font-bold">
            {totalFiltersActive}
          </span>
        )}
      </button>
    )
  }

  return (
    <Card className={`absolute ${getTopPosition()} ${getPosition()} p-4 bg-black/80 text-white border-amber-500/50 w-72 text-sm`}>
      {/* Title row with filter icon and expand button */}
      <div className="flex items-center justify-between mb-0">
        <div className="flex items-center">
          <h3 className="font-bold text-amber-300 text-sm">Filter</h3>
          <button
            onClick={() => onToggleCollapsed(true)}
            className="p-1 text-amber-300 hover:bg-amber-500/20 rounded transition-colors"
            title="Hide Filter"
            style={{ marginLeft: "10px" }}
          >
            <FilterIcon size={14} />
          </button>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-5 h-5 border border-amber-500/50 text-amber-300 hover:bg-amber-500/20 rounded flex items-center justify-center text-xs font-bold transition-colors ml-4"
          style={{ minWidth: "20px", minHeight: "20px" }}
        >
          {isExpanded ? "−" : "+"}
        </button>
      </div>

      {/* Active filters count row */}
      {totalFiltersActive > 0 && (
        <div className="mb-1">
          <span className="px-2 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-200 rounded text-xs">
            {totalFiltersActive} filter{totalFiltersActive !== 1 ? "s" : ""} active
          </span>
        </div>
      )}

      {isExpanded && (
        <div className="space-y-4">
          {/* Search Section */}
          <div>
            <h4 className="font-semibold text-amber-300 text-xs mb-2">Search</h4>
            <input
              type="text"
              placeholder="Search node names..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full px-2 py-1 bg-black/50 border border-amber-500/50 text-white text-xs rounded focus:outline-none focus:ring-1 focus:ring-amber-500/50 placeholder-gray-400"
            />
          </div>

          {/* Protocol Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-amber-300 text-xs">Protocols</h4>
              <div className="flex gap-2">
                <Button
                  onClick={handleSelectAll}
                  size="sm"
                  variant="outline"
                  className="border-green-500/50 text-green-300 hover:bg-green-500/20 text-xs bg-transparent h-6 px-2"
                >
                  Select All
                </Button>
                <Button
                  onClick={handleClearAll}
                  size="sm"
                  variant="outline"
                  className="border-red-500/50 text-red-300 hover:bg-red-500/20 text-xs bg-transparent h-6 px-2"
                >
                  Clear All
                </Button>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2">
              {allProtocols.map((protocol) => (
                <label
                  key={protocol}
                  className="flex items-center space-x-2 cursor-pointer hover:bg-amber-500/10 p-1 rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedProtocols.includes(protocol)}
                    onChange={() => handleProtocolToggle(protocol)}
                    className="rounded border-amber-500/50 bg-transparent text-amber-500 focus:ring-amber-500/50 w-3 h-3"
                  />
                  <span className="text-xs text-gray-300">{protocol}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Income Generated Section */}
          <div>
            <h4 className="font-semibold text-amber-300 text-xs mb-2">Income Generated</h4>
            <div className="max-h-32 overflow-y-auto space-y-2">
              {allIncomeTypes.map((incomeType) => (
                <label
                  key={incomeType}
                  className="flex items-center space-x-2 cursor-pointer hover:bg-amber-500/10 p-1 rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedIncome.includes(incomeType)}
                    onChange={() => handleIncomeToggle(incomeType)}
                    className="rounded border-amber-500/50 bg-transparent text-amber-500 focus:ring-amber-500/50 w-3 h-3"
                  />
                  <span className="text-xs text-gray-300">{incomeType}</span>
                </label>
              ))}
            </div>
          </div>

          {totalFiltersActive > 0 && (
            <div className="pt-2 border-t border-amber-500/20">
              <p className="text-xs text-gray-400">
                Filter active - showing nodes matching{" "}
                {searchTerm.trim() && (selectedProtocols.length > 0 || selectedIncome.length > 0)
                  ? "search and selected criteria"
                  : searchTerm.trim()
                    ? "search"
                    : "selected criteria"}
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
