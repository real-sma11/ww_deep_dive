import type { NetworkState } from "../types/node"
import { applyMonochromaticMaterials } from "../utils/colorUtils"

// Define primary colors for each major family
const FAMILY_PRIMARY_COLORS = {
  center: "#FFD700", // Gold
  "tokenized-assets": "#4A90E2", // Blue
  staking: "#9B59B6", // Purple
  "supply-chain": "#E67E22", // Orange
}

// Create the initial network structure with relative positions
export const createInitialNetworkState = (): NetworkState => {
  const centerNode: any = {
    id: "center",
    name: "Network Hub",
    position: { x: 0, y: 0, z: 0 },
    angle: 0,
    radius: 0,
    level: 0,
    expanded: true,
    children: [],
  }

  const nodes: any[] = [
    {
      id: "tokenized-assets",
      name: "Tokenized Assets",
      position: { x: 0, y: 5, z: 0 },
      angle: 0,
      radius: 5,
      level: 1,
      parentId: "center",
      expanded: false,
      children: [
        {
          id: "nfts",
          name: "NFTs",
          position: { x: -3, y: 3, z: 1 },
          angle: 0,
          radius: 3,
          level: 2,
          expanded: false,
          children: [
            {
              id: "art-nfts",
              name: "Art NFTs",
              position: { x: -2, y: 2, z: 1 },
              angle: 0,
              radius: 2,
              level: 3,
              expanded: false,
            },
            {
              id: "gaming-nfts",
              name: "Gaming NFTs",
              position: { x: 2, y: -2, z: -1 },
              angle: 120,
              radius: 2,
              level: 3,
              expanded: false,
            },
          ],
        },
        {
          id: "defi",
          name: "DeFi",
          position: { x: 0, y: 3, z: 3 },
          angle: 120,
          radius: 3,
          level: 2,
          expanded: false,
        },
        {
          id: "real-estate",
          name: "Real Estate",
          position: { x: 3, y: 3, z: 1 },
          angle: 240,
          radius: 3,
          level: 2,
          expanded: false,
        },
      ],
    },
    {
      id: "staking",
      name: "Staking",
      position: { x: 4.5, y: -2.5, z: 0 },
      angle: 120,
      radius: 5,
      level: 1,
      parentId: "center",
      expanded: false,
      children: [
        {
          id: "pos",
          name: "Proof of Stake",
          position: { x: 3, y: 1.5, z: -1 },
          angle: 0,
          radius: 3,
          level: 2,
          expanded: false,
          children: [
            {
              id: "validators",
              name: "Validators",
              position: { x: 2.5, y: 2, z: -1 },
              angle: 0,
              radius: 2,
              level: 3,
              expanded: false,
              children: [
                // New children for Validators
                {
                  id: "validator-rewards",
                  name: "Validator Rewards",
                  position: { x: 1.5, y: 1.5, z: 0.5 }, // Relative to validators
                  angle: 0,
                  radius: 1.5,
                  level: 4,
                  expanded: false,
                },
                {
                  id: "slashing-events",
                  name: "Slashing Events",
                  position: { x: -1.5, y: -1.5, z: -0.5 }, // Relative to validators
                  angle: 180,
                  radius: 1.5,
                  level: 4,
                  expanded: false,
                },
              ],
            },
            {
              id: "delegators",
              name: "Delegators",
              position: { x: -2.5, y: -1, z: 2 },
              angle: 180,
              radius: 2,
              level: 3,
              expanded: false,
            },
            {
              id: "pos-rewards",
              name: "POS Rewards",
              position: { x: 1, y: 4.5, z: 0 },
              angle: 90,
              radius: 2,
              level: 3,
              expanded: false,
            },
            {
              id: "slashing",
              name: "Slashing",
              position: { x: 3.5, y: 2, z: 1 },
              angle: 270,
              radius: 2,
              level: 3,
              expanded: false,
            },
          ],
        },
        {
          id: "liquidity",
          name: "Liquidity Mining",
          position: { x: 1.5, y: -3, z: 1.5 },
          angle: 120,
          radius: 3,
          level: 2,
          expanded: false,
          children: [
            {
              id: "yield-farming",
              name: "Yield Farming",
              position: { x: 2.5, y: -1.5, z: 1 },
              angle: 0,
              radius: 2,
              level: 3,
              expanded: false,
            },
            {
              id: "liquidity-pools",
              name: "Liquidity Pools",
              position: { x: -2, y: -1.5, z: 0.5 },
              angle: 120,
              radius: 2,
              level: 3,
              expanded: false,
            },
            {
              id: "impermanent-loss",
              name: "Impermanent Loss",
              position: { x: 0.5, y: -3, z: -1 },
              angle: 240,
              radius: 2,
              level: 3,
              expanded: false,
            },
          ],
        },
        {
          id: "governance",
          name: "Governance",
          position: { x: 4, y: -1.5, z: 0 },
          angle: 240,
          radius: 3,
          level: 2,
          expanded: false,
        },
      ],
    },
    {
      id: "supply-chain",
      name: "Resource Supply Chain",
      position: { x: -4.5, y: -2.5, z: 0 },
      angle: 240,
      radius: 5,
      level: 1,
      parentId: "center",
      expanded: false,
      children: [
        {
          id: "tracking",
          name: "Asset Tracking",
          position: { x: -3, y: 1.5, z: 1.5 },
          angle: 0,
          radius: 3,
          level: 2,
          expanded: false,
        },
        {
          id: "verification",
          name: "Verification",
          position: { x: -4, y: -1.5, z: -1.5 },
          angle: 120,
          radius: 3,
          level: 2,
          expanded: false,
        },
        {
          id: "logistics",
          name: "Logistics",
          position: { x: -1.5, y: -3, z: -1.5 },
          angle: 240,
          radius: 3,
          level: 2,
          expanded: false,
        },
      ],
    },
  ]

  // Apply monochromatic material properties to the entire tree
  applyMonochromaticMaterials(centerNode, FAMILY_PRIMARY_COLORS.center, 0)
  nodes.forEach((node) => {
    const primaryColor = FAMILY_PRIMARY_COLORS[node.id as keyof typeof FAMILY_PRIMARY_COLORS]
    applyMonochromaticMaterials(node, primaryColor, 1)
  })

  return {
    centerNode,
    nodes,
    focusedNodeId: "center",
    isZoomedIn: false,
    breadcrumbs: [{ id: "center", name: "Network Hub" }],
  }
}

// Export the initial network state for reuse
export const initialNetworkState = createInitialNetworkState()
