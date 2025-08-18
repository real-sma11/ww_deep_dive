"use client"

import { Button } from "@/components/ui/button"
import { nodeDescriptions } from "../data/nodeDescriptions"
import type { Node3D } from "../types/node"

interface DescriptionPanelProps {
  node: Node3D
  onClose: () => void
}

export function DescriptionPanel({ node, onClose }: DescriptionPanelProps) {
  const description = nodeDescriptions[node.id] || {
    description: "No description available.",
    details: [],
    protocols: [],
    income: [],
  }

  return (
    <div className="h-full bg-black/80 backdrop-blur-sm border-l border-amber-500/30 p-6 overflow-y-auto">
      <div className="flex justify-between items-start mb-6">
        <h2 className="text-2xl font-bold text-white">{node.name}</h2>
        <Button
          onClick={onClose}
          variant="outline"
          size="sm"
          className="bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30"
        >
          Back to Overview
        </Button>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-amber-300 mb-3">Overview</h3>
          <p className="text-gray-300 leading-relaxed">{description.description}</p>
        </div>

        {description.details.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-amber-300 mb-3">Key Features</h3>
            <ul className="space-y-2">
              {description.details.map((detail, index) => (
                <li key={index} className="text-gray-300 flex items-start">
                  <span className="text-amber-500 mr-2">•</span>
                  {detail}
                </li>
              ))}
            </ul>
          </div>
        )}

        {description.protocols && description.protocols.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-amber-300 mb-3">Protocols</h3>
            <div className="flex flex-wrap gap-2">
              {description.protocols.map((protocol, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-200 rounded-full text-sm font-medium"
                >
                  {protocol}
                </span>
              ))}
            </div>
          </div>
        )}

        {description.income && description.income.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-amber-300 mb-3">Income Generated</h3>
            <div className="flex flex-wrap gap-2">
              {description.income.map((incomeType, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-green-500/20 border border-green-500/40 text-green-200 rounded-full text-sm font-medium"
                >
                  {incomeType}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-amber-500/20">
          <p className="text-sm text-gray-400">
            Double-click on other nodes to explore more components of the network.
          </p>
        </div>
      </div>
    </div>
  )
}
