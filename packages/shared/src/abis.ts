import { parseAbi } from "viem";

// These are the interfaces the frontend and agent code against; the deployed
// contracts (Layer 1) must conform to these signatures. Kept minimal — only
// what the UI and agent call.

export const erc20Abi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
]);

// DripVault — ERC-4626 subset + DRIP extensions.
export const dripVaultAbi = parseAbi([
  "function asset() view returns (address)",
  "function decimals() view returns (uint8)",
  "function totalAssets() view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function convertToAssets(uint256 shares) view returns (uint256)",
  "function convertToShares(uint256 assets) view returns (uint256)",
  "function previewDeposit(uint256 assets) view returns (uint256)",
  "function maxDeposit(address) view returns (uint256)",
  "function deposit(uint256 assets, address receiver) returns (uint256 shares)",
  "function withdraw(uint256 assets, address receiver, address owner) returns (uint256 shares)",
  "function depositTimestamp(address user) view returns (uint256)",
]);

// AgentController — allocation snapshot, constraint state, rebalance log.
export const agentControllerAbi = parseAbi([
  "function getAllocation() view returns (address[] assets, uint256[] weightsBps)",
  "function treasuryFloorBps() view returns (uint256)",
  "function currentTreasuryBps() view returns (uint256)",
  "function correlationCapBps() view returns (uint256)",
  "function currentCorrelationBps() view returns (uint256)",
  "function maxRebalanceBps() view returns (uint256)",
  "function nextEvalTimestamp() view returns (uint256)",
  "event Rebalance(uint256 indexed id, address indexed agent, bytes32 reasonHash, uint256 timestamp)",
]);

// StreakManager.
export const streakManagerAbi = parseAbi([
  "function streakOf(address user) view returns (uint256 days_)",
  "function multiplierBps(address user) view returns (uint256)",
  "function shieldAvailable(address user) view returns (bool)",
  "function weeklyResetTimestamp() view returns (uint256)",
]);

// ERC-8004 ReputationRegistry — agent performance record.
export const reputationRegistryAbi = parseAbi([
  "function cumulativeYieldBps(address agent) view returns (int256)",
  "function benchmarkYieldBps(address agent) view returns (int256)",
  "function sharpeBps(address agent) view returns (int256)",
  "function maxDrawdownBps(address agent) view returns (uint256)",
  "function uptimeBps(address agent) view returns (uint256)",
]);

// AssetRegistry — enumerate whitelisted assets + their config.
export const assetRegistryAbi = parseAbi([
  "function assetCount() view returns (uint256)",
  "function assetAt(uint256 index) view returns (address)",
  "function riskDiscountBps(address asset) view returns (uint256)",
  "function capBps(address asset) view returns (uint256)",
]);

// Aave V3 ProtocolDataProvider — supply APY for an asset (currentLiquidityRate, ray).
export const aaveDataProviderAbi = parseAbi([
  "function getReserveData(address asset) view returns (uint256 unbacked, uint256 accruedToTreasuryScaled, uint256 totalAToken, uint256 totalStableDebt, uint256 totalVariableDebt, uint256 liquidityRate, uint256 variableBorrowRate, uint256 stableBorrowRate, uint256 averageStableBorrowRate, uint256 liquidityIndex, uint256 variableBorrowIndex, uint40 lastUpdateTimestamp)",
]);
