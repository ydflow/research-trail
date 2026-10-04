from datetime import datetime

from fastapi.testclient import TestClient
from pydantic import ValidationError
import pytest

from research_trail.app import create_app
from research_trail.market import FixtureMarketProvider, MARKET_TIME, MarketSnapshot, UnknownSymbolError

TOKEN = "market-test-only-" + "x" * 48
HEADERS = {"X-ResearchTrail-Token": TOKEN}
EXPECTED = {"AAPL.US": 189.43, "NVDA.US": 880.12, "MSFT.US": 412.60, "TSLA.US": 175.22}


@pytest.mark.parametrize("symbol,price", EXPECTED.items())
def test_quote_and_candles_are_one_fixed_snapshot(symbol, price):
    with TestClient(create_app(TOKEN)) as client:
        first = client.get(f"/market/snapshot/{symbol}", headers=HEADERS)
        second = client.get(f"/market/snapshot/{symbol}", headers=HEADERS)
        assert first.status_code == second.status_code == 200
        a, b = first.json(), second.json()
        assert a["quote"]["symbol"] == symbol
        assert a["quote"]["last_price"] == a["klines"][-1]["close"] == price
        assert a["quote"]["previous_close"] == a["klines"][-2]["close"]
        assert len(a["klines"]) == 10
        assert a["source"] == "fixture" and a["data_label"] == "模拟数据"
        assert datetime.fromisoformat(a["market_time"]) == MARKET_TIME
        assert datetime.fromisoformat(a["fetched_at"]) > MARKET_TIME
        assert a.pop("fetched_at") != b.pop("fetched_at")
        assert a == b  # all market data/provenance unchanged, except acquisition time


def test_catalog_and_unknown_symbols_never_fabricate_prices():
    provider = FixtureMarketProvider()
    with pytest.raises(UnknownSymbolError):
        provider.snapshot("UNKNOWN.US")
    with TestClient(create_app(TOKEN)) as client:
        assert [item["symbol"] for item in client.get("/market/symbols", headers=HEADERS).json()] == list(EXPECTED)
        response = client.get("/market/snapshot/UNKNOWN.US", headers=HEADERS)
        assert response.status_code == 404
        assert response.json()["code"] == "UNKNOWN_SYMBOL"
        assert "未知股票代码" in response.json()["message"]
        assert "quote" not in response.json()


@pytest.mark.parametrize("path", ["/market/symbols", "/market/snapshot/AAPL.US", "/market/snapshot/UNKNOWN.US"])
def test_all_market_routes_require_startup_token(path):
    with TestClient(create_app(TOKEN)) as client:
        assert client.get(path).status_code == 401
        assert client.get(path, headers={"X-ResearchTrail-Token": "wrong"}).status_code == 401


@pytest.mark.parametrize("mutation", [
    lambda data: data["klines"][-1].update(close=777),
    lambda data: data["klines"][0].update(high=0),
    lambda data: data["klines"][0].update(volume=-1),
    lambda data: data["klines"][0].update(open=float("nan")),
    lambda data: data["klines"].reverse(),
    lambda data: data.update(market_time=datetime(2024, 1, 16, 21)),
    lambda data: data["quote"].update(change=0),
    lambda data: data["quote"].update(previous_close=999),
])
def test_contract_rejects_invalid_or_inconsistent_data(mutation):
    data = FixtureMarketProvider().snapshot("AAPL.US").model_dump()
    mutation(data)
    with pytest.raises(ValidationError):
        MarketSnapshot.model_validate(data)


def test_provider_returns_fresh_objects_and_not_shared_mutable_cache():
    provider = FixtureMarketProvider()
    first = provider.snapshot("AAPL.US")
    first.klines.clear()
    assert len(provider.snapshot("AAPL.US").klines) == 10


def test_openapi_exposes_contracts_without_runtime_credentials():
    schema = create_app(TOKEN).openapi()
    assert {"Quote", "Kline", "MarketSnapshot", "MarketSymbol", "MarketError"} <= schema["components"]["schemas"].keys()
    assert TOKEN not in str(schema)
    assert schema["components"]["schemas"]["Kline"]["properties"]["timestamp"]["description"].startswith("UTC Unix seconds")
    assert schema["paths"]["/market/snapshot/{symbol}"]["get"]["responses"]["404"]["content"]["application/json"]["schema"]["$ref"].endswith("MarketError")
