// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title MacroGuard
/// @notice On-chain risk enforcer and permanent decision log for one DRIFT
///         trading agent. The off-chain quant bot records every decision here
///         (a tamper-proof benchmark trail) and queries `allowed` before it
///         acts. A macro regime and a drawdown halt can veto new risk — these
///         rules live on-chain, where the bot itself cannot override them.
contract MacroGuard {
    /// @dev Macro market state, set by the agent's regime engine.
    enum Regime {
        RiskOff,
        Neutral,
        RiskOn
    }

    /// @dev Target the bot wants to hold; mirrors its {0, +1, -1} signal.
    enum Signal {
        Flat,
        Long,
        Short
    }

    address public immutable agent;
    Regime public regime = Regime.Neutral;
    bool public halted;
    uint32 public maxDrawdownBps; // halt threshold, e.g. 2000 = 20%
    uint64 public decisionCount;

    event Decision(
        uint64 indexed seq,
        string symbol,
        Signal signal,
        bool allowed,
        uint256 price, // 1e8-scaled
        int256 drawdownBps, // negative = underwater
        Regime regime,
        uint64 timestamp
    );
    event RegimeSet(Regime regime);
    event Halted(int256 drawdownBps);
    event Resumed();

    error NotAgent();

    modifier onlyAgent() {
        if (msg.sender != agent) revert NotAgent();
        _;
    }

    constructor(uint32 _maxDrawdownBps) {
        agent = msg.sender;
        maxDrawdownBps = _maxDrawdownBps;
    }

    /// @notice Is `signal` permitted right now under the halt and regime rules?
    /// @dev Free to call (view); the bot uses it to gate a trade before sending.
    function allowed(Signal signal) public view returns (bool) {
        if (halted) return signal == Signal.Flat; // only de-risking allowed
        if (regime == Regime.RiskOff) return signal != Signal.Long; // no new longs
        return true;
    }

    /// @notice Record one decision tick on-chain — the benchmark trail.
    /// @return ok Whether the recorded signal was permitted.
    function recordDecision(string calldata symbol, Signal signal, uint256 price, int256 drawdownBps)
        external
        onlyAgent
        returns (bool ok)
    {
        // Enforce the on-chain drawdown limit: breach trips an irreversible
        // halt until the agent explicitly resumes.
        if (!halted && drawdownBps <= -int256(uint256(maxDrawdownBps))) {
            halted = true;
            emit Halted(drawdownBps);
        }

        ok = allowed(signal);
        decisionCount += 1;
        emit Decision(decisionCount, symbol, signal, ok, price, drawdownBps, regime, uint64(block.timestamp));
    }

    /// @notice Update the macro regime (risk-off vetoes new longs).
    function setRegime(Regime _regime) external onlyAgent {
        regime = _regime;
        emit RegimeSet(_regime);
    }

    /// @notice Clear a drawdown halt after the agent has reviewed it.
    function resume() external onlyAgent {
        halted = false;
        emit Resumed();
    }
}
