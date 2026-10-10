"""Opt-in offline proof; no app endpoint, credentials or durable database."""
import argparse
import json
from pathlib import Path

from .market import FixtureMarketProvider
from .pi_bridge import PiOfflineBridge
from .tools import market_tools


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--node", type=Path, required=True, help="Absolute existing Node executable")
    options = parser.parse_args()
    bridge = PiOfflineBridge(market_tools(FixtureMarketProvider()), node=options.node,
        batches=[[dict(id="quote_1", name="market_quote", arguments='{"symbol":"AAPL.US"}')]])
    events = []
    outcome = bridge.run("Explicit offline fixture", lambda kind, payload: events.append({"type":kind, "payload":payload}))
    print(json.dumps(dict(status=outcome.status, answer=outcome.answer, proof=bridge.proof,
                         execution_count=bridge.execution_count, events=events), ensure_ascii=False, indent=2))
    if outcome.status != "completed" or bridge.execution_count != 1:
        raise SystemExit(1)


if __name__ == "__main__": main()
