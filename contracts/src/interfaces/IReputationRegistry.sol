// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IReputationRegistry — ERC-8004-aligned agent performance record.
/// @notice Append-only public track record for the agent key. Signed values
///         are bps; yield values can be negative.
interface IReputationRegistry {
    function cumulativeYieldBps(address agent) external view returns (int256);
    function benchmarkYieldBps(address agent) external view returns (int256);
    function sharpeBps(address agent) external view returns (int256);
    function maxDrawdownBps(address agent) external view returns (uint256);
    function uptimeBps(address agent) external view returns (uint256);
}
