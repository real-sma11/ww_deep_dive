"use client"

import { Card } from "@/components/ui/card"

interface BreadcrumbNavigationProps {
  breadcrumbs: { id: string; name: string }[]
  onOverviewClick: () => void
  onBreadcrumbClick: (targetId: string, index: number) => void
}

export function BreadcrumbNavigation({ breadcrumbs, onOverviewClick, onBreadcrumbClick }: BreadcrumbNavigationProps) {
  return (
    <div className="absolute top-4 left-4 right-4 z-10">
      <Card className="p-3 bg-black/70 text-white border-amber-500/50">
        <div className="flex items-center space-x-2 text-sm">
          <span className="text-amber-300">Navigation:</span>
          <button
            onClick={onOverviewClick}
            className="px-2 py-1 rounded transition-colors text-blue-300 hover:bg-blue-500/20 hover:text-blue-200"
          >
            Overview
          </button>
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.id} className="flex items-center">
              <span className="text-gray-400 mx-2">{">"}</span>
              <button
                onClick={() => onBreadcrumbClick(crumb.id, index)}
                className={`px-2 py-1 rounded transition-colors ${
                  index === breadcrumbs.length - 1
                    ? "bg-amber-500/30 text-amber-200 cursor-default"
                    : "text-blue-300 hover:bg-blue-500/20 hover:text-blue-200"
                }`}
                disabled={index === breadcrumbs.length - 1}
              >
                {crumb.name}
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
