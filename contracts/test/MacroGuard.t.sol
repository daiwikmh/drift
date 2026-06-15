// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MacroGuard} from "../src/MacroGuard.sol";

contract MacroGuardTest is Test {
    MacroGuard guard;
    address constant STRANGER = address(0xBEEF);

    function setUp() public {
        guard = new MacroGuard(2000); // 20% drawdown halt
    }

    function test_NeutralAllowsEverything() public view {
        assertTrue(guard.allowed(MacroGuard.Signal.Long));
        assertTrue(guard.allowed(MacroGuard.Signal.Short));
        assertTrue(guard.allowed(MacroGuard.Signal.Flat));
    }

    function test_RiskOffVetoesNewLongs() public {
        guard.setRegime(MacroGuard.Regime.RiskOff);
        assertFalse(guard.allowed(MacroGuard.Signal.Long));
        assertTrue(guard.allowed(MacroGuard.Signal.Short)); // de-risking still ok
        assertTrue(guard.allowed(MacroGuard.Signal.Flat));
    }

    function test_DrawdownBreachAutoHalts() public {
        // -19.99% does not breach a 20% limit.
        guard.recordDecision("BTCUSDT", MacroGuard.Signal.Long, 65000e8, -1999);
        assertFalse(guard.halted());

        // -20% trips the halt; afterwards only Flat is allowed.
        bool ok = guard.recordDecision("BTCUSDT", MacroGuard.Signal.Long, 64000e8, -2000);
        assertFalse(ok);
        assertTrue(guard.halted());
        assertFalse(guard.allowed(MacroGuard.Signal.Long));
        assertTrue(guard.allowed(MacroGuard.Signal.Flat));
    }

    function test_ResumeClearsHalt() public {
        guard.recordDecision("BTCUSDT", MacroGuard.Signal.Long, 64000e8, -2500);
        assertTrue(guard.halted());
        guard.resume();
        assertFalse(guard.halted());
        assertTrue(guard.allowed(MacroGuard.Signal.Long));
    }

    function test_DecisionCountIncrements() public {
        assertEq(guard.decisionCount(), 0);
        guard.recordDecision("ETHUSDT", MacroGuard.Signal.Short, 3200e8, 0);
        guard.recordDecision("ETHUSDT", MacroGuard.Signal.Flat, 3210e8, 50);
        assertEq(guard.decisionCount(), 2);
    }

    function test_OnlyAgentCanRecord() public {
        vm.prank(STRANGER);
        vm.expectRevert(MacroGuard.NotAgent.selector);
        guard.recordDecision("BTCUSDT", MacroGuard.Signal.Long, 65000e8, 0);
    }

    function test_OnlyAgentCanSetRegime() public {
        vm.prank(STRANGER);
        vm.expectRevert(MacroGuard.NotAgent.selector);
        guard.setRegime(MacroGuard.Regime.RiskOff);
    }
}
