"""No FX, no LLM, no guessed quotes. Exact Decimal position arithmetic by currency."""
from decimal import Decimal, localcontext
from .portfolio_contracts import HoldingValue, CurrencyValue, decimal_text

def calculate(snapshot):
    holdings=[]; buckets=[]
    with localcontext() as ctx:
        ctx.prec=64
        for h in snapshot.holdings:
            q=Decimal(h.quantity)
            cost=q*Decimal(h.cost_price) if h.cost_price is not None else None
            value=q*Decimal(h.market_price) if h.market_price is not None else None
            pnl=value-cost if value is not None and cost is not None else None
            percent=(pnl/cost*100).quantize(Decimal('0.000001')) if pnl is not None and cost else None
            holdings.append(HoldingValue(**h.model_dump(),cost=decimal_text(cost),market_value=decimal_text(value),
                pnl=decimal_text(pnl),pnl_percent=decimal_text(percent)))
        currencies=sorted({h.currency for h in holdings}|{c.currency for c in snapshot.cash})
        for currency in currencies:
            rows=[h for h in holdings if h.currency==currency]
            def total(field):
                values=[getattr(h,field) for h in rows]
                return sum((Decimal(v) for v in values),Decimal(0)) if all(v is not None for v in values) else None
            known=sum((Decimal(h.market_value) for h in rows if h.market_value is not None),Decimal(0))
            value=total('market_value'); cost=total('cost'); pnl=total('pnl')
            # Absence of a cash row is missing, not proof of a zero balance.
            cash_row=next((c for c in snapshot.cash if c.currency==currency),None)
            cash=Decimal(cash_row.amount) if cash_row and cash_row.amount is not None else None
            assets=value+cash if value is not None and cash is not None else None
            buckets.append(CurrencyValue(currency=currency,holdings_count=len(rows),valued_count=sum(h.market_value is not None for h in rows),
                cost=decimal_text(cost),known_market_value=decimal_text(known),market_value=decimal_text(value),
                pnl=decimal_text(pnl),cash=decimal_text(cash),assets=decimal_text(assets)))
    return holdings,buckets
