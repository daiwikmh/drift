// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {MacroGuard} from "../src/MacroGuard.sol";

/// @notice Deploys MacroGuard. The deployer becomes the agent. Reads the halt
///         threshold from MAX_DRAWDOWN_BPS (default 2000 = 20%).
contract Deploy is Script {
    function run() external returns (MacroGuard guard) {
        uint32 maxDrawdownBps = uint32(vm.envOr("MAX_DRAWDOWN_BPS", uint256(2000)));

        vm.startBroadcast();
        guard = new MacroGuard(maxDrawdownBps);
        vm.stopBroadcast();

        console.log("MacroGuard deployed at:", address(guard));
        console.log("agent:", guard.agent());
        console.log("maxDrawdownBps:", guard.maxDrawdownBps());
    }
}
