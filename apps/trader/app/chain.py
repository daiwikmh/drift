"""Optional on-chain guard: mirrors each bot decision to MacroGuard on Mantle.

When MACROGUARD_ADDRESS, ETH_PRIVATE_KEY and an RPC are configured the engine
records every decision to the contract (a permanent, verifiable benchmark trail)
and checks the on-chain macro/halt rules before it trades. If anything is unset
or the chain is unreachable the guard stays inert and fails open, so a bot never
stalls on chain trouble — the local drawdown stop remains the hard safety.
"""
from __future__ import annotations

import threading
from typing import Optional

from .config import (
    ETH_PRIVATE_KEY,
    MACROGUARD_ADDRESS,
    MANTLE_CHAIN_ID,
    MANTLE_EXPLORER,
    MANTLE_RPC_URL,
)

# Solidity Signal enum: Flat=0, Long=1, Short=2. The bot's target is {0, +1, -1}.
def _signal_enum(target: int) -> int:
    return 1 if target > 0 else 2 if target < 0 else 0


# Minimal ABI — only the functions the engine calls.
_ABI = [
    {
        "type": "function",
        "name": "allowed",
        "stateMutability": "view",
        "inputs": [{"name": "signal", "type": "uint8"}],
        "outputs": [{"name": "", "type": "bool"}],
    },
    {
        "type": "function",
        "name": "recordDecision",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "symbol", "type": "string"},
            {"name": "signal", "type": "uint8"},
            {"name": "price", "type": "uint256"},
            {"name": "drawdownBps", "type": "int256"},
        ],
        "outputs": [{"name": "ok", "type": "bool"}],
    },
    {
        "type": "function",
        "name": "regime",
        "stateMutability": "view",
        "inputs": [],
        "outputs": [{"name": "", "type": "uint8"}],
    },
    {
        "type": "function",
        "name": "setRegime",
        "stateMutability": "nonpayable",
        "inputs": [{"name": "_regime", "type": "uint8"}],
        "outputs": [],
    },
]


class ChainGuard:
    """Thin web3 wrapper around one MacroGuard deployment."""

    def __init__(self) -> None:
        self.enabled = False
        self.address: Optional[str] = None
        self._lock = threading.Lock()
        if not (MACROGUARD_ADDRESS and ETH_PRIVATE_KEY):
            return
        try:
            from web3 import Web3
            from eth_account import Account

            self._w3 = Web3(Web3.HTTPProvider(MANTLE_RPC_URL))
            self._account = Account.from_key(ETH_PRIVATE_KEY)
            self.address = Web3.to_checksum_address(MACROGUARD_ADDRESS)
            self._contract = self._w3.eth.contract(address=self.address, abi=_ABI)
            self.enabled = True
        except Exception as e:  # missing dep / bad key — stay inert
            print(f"[drift] chain guard disabled: {e}")

    def info(self) -> dict:
        return {
            "enabled": self.enabled,
            "address": self.address,
            "chain_id": MANTLE_CHAIN_ID,
            "rpc": MANTLE_RPC_URL,
            "explorer": f"{MANTLE_EXPLORER}/address/{self.address}" if self.address else None,
            "explorer_base": MANTLE_EXPLORER,
        }

    def allowed(self, target: int) -> bool:
        """On-chain veto check (free). Fails open so chain trouble never blocks."""
        if not self.enabled:
            return True
        try:
            return bool(self._contract.functions.allowed(_signal_enum(target)).call())
        except Exception:
            return True

    def _send(self, fn) -> Optional[str]:
        """Build, sign, send and confirm a contract call. Returns the 0x tx hash."""
        with self._lock:  # one agent key → serialise nonces across bots
            try:
                tx = fn.build_transaction(
                    {
                        "from": self._account.address,
                        "nonce": self._w3.eth.get_transaction_count(self._account.address),
                        "gas": 200_000,
                        "gasPrice": self._w3.eth.gas_price,
                        "chainId": MANTLE_CHAIN_ID,
                    }
                )
                signed = self._account.sign_transaction(tx)
                h = self._w3.eth.send_raw_transaction(signed.raw_transaction)
                self._w3.eth.wait_for_transaction_receipt(h, timeout=30)
                hx = h.hex()
                return hx if hx.startswith("0x") else f"0x{hx}"
            except Exception as e:
                print(f"[drift] tx failed: {e}")
                return None

    def record(self, symbol: str, target: int, price: float, drawdown: float) -> Optional[str]:
        """Log one decision on-chain. Returns the tx hash, or None if disabled/failed."""
        if not self.enabled:
            return None
        return self._send(
            self._contract.functions.recordDecision(
                symbol, _signal_enum(target), int(round(price * 1e8)), int(round(drawdown * 10_000))
            )
        )

    def set_regime(self, regime: int) -> Optional[str]:
        """Push a new macro regime on-chain (RiskOff=0, Neutral=1, RiskOn=2)."""
        if not self.enabled:
            return None
        return self._send(self._contract.functions.setRegime(int(regime)))

    def current_regime(self) -> Optional[int]:
        """Read the regime currently enforced on-chain, or None if unavailable."""
        if not self.enabled:
            return None
        try:
            return int(self._contract.functions.regime().call())
        except Exception:
            return None


guard = ChainGuard()
