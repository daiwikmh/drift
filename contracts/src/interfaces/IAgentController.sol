// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IAgentController — the on-chain half of the DRIP agent.
/// @notice The off-chain agent PROPOSES; this contract ENFORCES and EXECUTES.
///         Every constraint below is a hard invariant checked inside
///         `rebalance` — a proposal that violates any of them reverts.
///         The agent key can call `rebalance` and nothing else; it can never
///         withdraw user funds.
///
/// Invariants (enforced on every rebalance):
///   I1  treasury share after rebalance >= treasuryFloorBps
///   I2  portfolio ETH-correlation after rebalance <= correlationCapBps
///   I3  total weight moved in one call <= maxRebalanceBps
///   I4  every target asset is whitelisted in the AssetRegistry and its
///       weight <= the registry's per-asset capBps
///   I5  sum(weightsBps) + treasury share == 10_000
///   I6  block.timestamp >= nextEvalTimestamp (one rebalance per epoch)
///   I7  only the registered agent key may call rebalance
interface IAgentController {
    /// @notice Emitted on every executed rebalance. The full human-readable
    ///         reason text lives off-chain (DA), keyed by `reasonHash`.
    event Rebalance(
        uint256 indexed id,
        address indexed agent,
        bytes32 reasonHash,
        uint256 timestamp
    );

    // --- agent write path ---------------------------------------------------

    /// @notice Execute a rebalance toward `weightsBps` over `assets`.
    /// @dev Reverts unless ALL invariants I1–I7 hold.
    /// @param assets      target assets (must be registry-whitelisted)
    /// @param weightsBps  target weights in basis points, aligned with assets
    /// @param reasonHash  keccak256 of the human-readable rationale stored in DA
    /// @return id         monotonically increasing rebalance id
    function rebalance(
        address[] calldata assets,
        uint256[] calldata weightsBps,
        bytes32 reasonHash
    ) external returns (uint256 id);

    // --- views (read by the dashboard and the agent) -------------------------

    function getAllocation()
        external
        view
        returns (address[] memory assets, uint256[] memory weightsBps);

    function treasuryFloorBps() external view returns (uint256);
    function currentTreasuryBps() external view returns (uint256);
    function correlationCapBps() external view returns (uint256);
    function currentCorrelationBps() external view returns (uint256);
    function maxRebalanceBps() external view returns (uint256);
    function nextEvalTimestamp() external view returns (uint256);

    /// @notice The registered agent signing key (EOA bound via ERC-8004).
    function agent() external view returns (address);
}
