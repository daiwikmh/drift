// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IStreakManager — deposit-streak rewards.
interface IStreakManager {
    function streakOf(address user) external view returns (uint256 days_);
    function multiplierBps(address user) external view returns (uint256);
    function shieldAvailable(address user) external view returns (bool);
    function weeklyResetTimestamp() external view returns (uint256);
}
