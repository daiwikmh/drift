// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IAssetRegistry — whitelist + per-asset risk config.
/// @notice Governance-curated. The AgentController refuses any asset not
///         registered here (invariant I4).
interface IAssetRegistry {
    function assetCount() external view returns (uint256);
    function assetAt(uint256 index) external view returns (address);

    /// @notice Haircut applied to the asset's raw yield when scoring (bps).
    function riskDiscountBps(address asset) external view returns (uint256);

    /// @notice Maximum portfolio weight this asset may hold (bps).
    function capBps(address asset) external view returns (uint256);
}
