export const nodeDescriptions: Record<string, { description: string; details: string[]; protocols: string[]; income: string[] }> = {
  center: {
    description:
      "The central hub of the decentralized network ecosystem, connecting all major blockchain infrastructure components.",
    details: [
      "Orchestrates communication between different network layers",
      "Manages consensus mechanisms and validation processes",
      "Provides unified access to distributed services",
      "Ensures network security and integrity",
      "Facilitates cross-chain interoperability",
    ],
    protocols: ["Ethereum", "Polygon", "Cosmos", "Polkadot", "Avalanche"],
    income: ["Project"],
  },
  "tokenized-assets": {
    description:
      "Digital representation of real-world and virtual assets on the blockchain, enabling fractional ownership and global accessibility.",
    details: [
      "Real estate tokenization for fractional ownership",
      "Art and collectibles as non-fungible tokens",
      "Commodity tokens backed by physical assets",
      "Security tokens representing equity or debt",
      "Utility tokens for platform access and services",
    ],
    protocols: ["Ethereum", "Polygon", "Solana", "Flow"],
    income: ["Investors", "Creators"],
  },
  staking: {
    description:
      "Mechanism for securing proof-of-stake networks while earning rewards by locking tokens as collateral.",
    details: [
      "Validator node operation and delegation",
      "Liquid staking for maintaining liquidity",
      "Slashing protection and risk management",
      "Reward distribution and compounding",
      "Governance participation through staked tokens",
    ],
    protocols: ["Ethereum", "Cosmos", "Polkadot", "Cardano", "Solana"],
    income: ["Investors"],
  },
  "supply-chain": {
    description:
      "Blockchain-based tracking and verification system for goods and resources throughout their lifecycle.",
    details: [
      "End-to-end product traceability",
      "Authenticity verification and anti-counterfeiting",
      "Automated compliance and regulatory reporting",
      "Smart contract-based logistics coordination",
      "Sustainability and carbon footprint tracking",
    ],
    protocols: ["Ethereum", "Hyperledger", "VeChain", "Polygon"],
    income: ["Project"],
  },
  nfts: {
    description: "Non-fungible tokens representing unique digital assets and collectibles.",
    details: [
      "Unique digital ownership certificates",
      "Royalty mechanisms for creators",
      "Metadata and provenance tracking",
      "Cross-platform compatibility",
    ],
    protocols: ["Ethereum", "Polygon", "Solana", "Flow", "Tezos"],
    income: ["Creators", "Investors"],
  },
  defi: {
    description: "Decentralized finance protocols enabling permissionless financial services.",
    details: [
      "Automated market makers",
      "Lending and borrowing protocols",
      "Yield farming opportunities",
      "Decentralized exchanges",
    ],
    protocols: ["Ethereum", "Polygon", "Avalanche", "BSC"],
    income: ["Investors"],
  },
  "real-estate": {
    description: "Tokenized real estate assets enabling fractional property ownership.",
    details: [
      "Property tokenization",
      "Fractional ownership",
      "Rental income distribution",
      "Global property investment",
    ],
    protocols: ["Ethereum", "Polygon", "Avalanche"],
    income: ["Investors"],
  },
  "art-nfts": {
    description: "Digital art represented as non-fungible tokens.",
    details: ["Digital art ownership", "Artist royalties", "Gallery exhibitions", "Collector communities"],
    protocols: ["Ethereum", "Tezos", "Flow", "Solana"],
    income: ["Creators"],
  },
  "gaming-nfts": {
    description: "Gaming assets and items as tradeable NFTs.",
    details: [
      "In-game asset ownership",
      "Cross-game compatibility",
      "Play-to-earn mechanics",
      "Virtual world economies",
    ],
    protocols: ["Polygon", "Solana", "Immutable X", "Flow"],
    income: ["Creators", "Project"],
  },
  pos: {
    description: "Proof of Stake consensus mechanism for blockchain networks.",
    details: ["Energy-efficient consensus", "Validator selection", "Stake-based security", "Network governance"],
    protocols: ["Ethereum", "Cosmos", "Polkadot", "Cardano"],
    income: ["Investors"],
  },
  validators: {
    description: "Network validators securing proof-of-stake blockchains.",
    details: ["Block validation", "Network security", "Reward distribution", "Slashing penalties"],
    protocols: ["Ethereum", "Cosmos", "Polkadot", "Solana"],
    income: ["Investors"],
  },
  "validator-rewards": {
    description: "Mechanisms for distributing rewards to validators for their participation in network consensus.",
    details: [
      "Block rewards for proposing new blocks",
      "Transaction fees from processed transactions",
      "Inflationary rewards to incentivize staking",
      "Reward compounding strategies",
    ],
    protocols: ["Ethereum", "Cosmos", "Polkadot"],
    income: ["Investors"],
  },
  "slashing-events": {
    description: "Penalties imposed on validators for malicious behavior or protocol violations.",
    details: [
      "Double-signing detection and punishment",
      "Downtime penalties for validator unresponsiveness",
      "Protocol rule violations leading to stake reduction",
      "Mechanisms for appealing slashing decisions",
    ],
    protocols: ["Ethereum", "Solana", "Polkadot"],
    income: ["None"],
  },
  delegators: {
    description: "Token holders delegating stake to validators.",
    details: ["Stake delegation", "Reward sharing", "Validator selection", "Risk management"],
    protocols: ["Cosmos", "Polkadot", "Cardano", "Tezos"],
    income: ["Investors"],
  },
  "pos-rewards": {
    description: "Reward mechanisms for proof-of-stake participation.",
    details: ["Staking rewards", "Inflation mechanisms", "Reward distribution", "Compound staking"],
    protocols: ["Ethereum", "Cosmos", "Polkadot", "Cardano"],
    income: ["Investors"],
  },
  slashing: {
    description: "Penalty mechanisms for malicious or faulty validator behavior.",
    details: ["Validator penalties", "Network security", "Stake reduction", "Behavior monitoring"],
    protocols: ["Ethereum", "Cosmos", "Polkadot", "Solana"],
    income: ["None"],
  },
  liquidity: {
    description: "Liquidity mining and provision mechanisms.",
    details: ["Liquidity provision", "Mining rewards", "Pool participation", "Yield optimization"],
    protocols: ["Ethereum", "Polygon", "Avalanche", "BSC"],
    income: ["Investors"],
  },
  "yield-farming": {
    description: "Yield farming strategies for maximizing returns.",
    details: ["Yield optimization", "Strategy automation", "Risk management", "Reward compounding"],
    protocols: ["Ethereum", "Polygon", "Avalanche", "BSC"],
    income: ["Investors"],
  },
  "liquidity-pools": {
    description: "Decentralized liquidity pools for trading and lending.",
    details: ["Automated market making", "Trading fees", "Impermanent loss", "Pool governance"],
    protocols: ["Ethereum", "Polygon", "Avalanche", "BSC"],
    income: ["Investors"],
  },
  "impermanent-loss": {
    description: "Risk management for liquidity providers.",
    details: ["Loss calculation", "Risk mitigation", "Strategy optimization", "Protection mechanisms"],
    protocols: ["Ethereum", "Polygon", "Avalanche"],
    income: ["None"],
  },
  governance: {
    description: "Decentralized governance mechanisms for protocol decisions.",
    details: ["Proposal creation", "Voting mechanisms", "Execution systems", "Community participation"],
    protocols: ["Ethereum", "Cosmos", "Polkadot", "Compound"],
    income: ["Project"],
  },
  tracking: {
    description: "Asset tracking and traceability systems.",
    details: ["Supply chain visibility", "Product authentication", "Quality assurance", "Compliance monitoring"],
    protocols: ["Ethereum", "Hyperledger", "VeChain"],
    income: ["Project"],
  },
  verification: {
    description: "Verification and authentication systems.",
    details: ["Identity verification", "Document authentication", "Compliance checking", "Audit trails"],
    protocols: ["Ethereum", "Hyperledger", "Polygon"],
    income: ["Project"],
  },
  logistics: {
    description: "Logistics and transportation management systems.",
    details: ["Route optimization", "Delivery tracking", "Cost management", "Performance analytics"],
    protocols: ["Ethereum", "VeChain", "Hyperledger"],
    income: ["Project"],
  },
}
