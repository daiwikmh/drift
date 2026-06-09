// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IDripVault — ERC-4626 subset + DRIP extensions.
/// @notice Users deposit/withdraw here and ONLY here. The AgentController
///         moves funds between whitelisted venues but can never transfer
///         assets out of the system.
interface IDripVault {
    function asset() external view returns (address);
    function decimals() external view returns (uint8);
    function totalAssets() external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function balanceOf(address owner) external view returns (uint256);
    function convertToAssets(uint256 shares) external view returns (uint256);
    function convertToShares(uint256 assets_) external view returns (uint256);
    function previewDeposit(uint256 assets_) external view returns (uint256);
    function maxDeposit(address receiver) external view returns (uint256);

    function deposit(uint256 assets_, address receiver)
        external
        returns (uint256 shares);

    function withdraw(uint256 assets_, address receiver, address owner)
        external
        returns (uint256 shares);

    /// @notice Timestamp of the user's most recent deposit (streak input).
    function depositTimestamp(address user) external view returns (uint256);
}
