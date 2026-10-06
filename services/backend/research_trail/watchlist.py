"""Python owns selection and bounded, ordered watch symbols across page reloads/restarts."""
from sqlalchemy import select
from .models import WatchlistRecord, WorkspaceRecord
from .market import FixtureMarketProvider
from .workspace_contracts import SymbolInput, WatchEntry, WorkspaceState

class WatchlistError(Exception):
    pass

class WatchlistStore:
    def __init__(self, database):
        self.database = database
        self.catalog = {s.symbol:s.name for s in FixtureMarketProvider().symbols()}
        with database.write() as db:
            # Seed exactly once. An intentionally empty watchlist stays empty after restart.
            if db.get(WorkspaceRecord, 1) is None:
                db.add(WorkspaceRecord(id=1, active_symbol='AAPL.US', revision=0))
                for i,(symbol,name) in enumerate(self.catalog.items()):
                    db.add(WatchlistRecord(symbol=symbol, name=name, position=i))

    @staticmethod
    def _state(db):
        row=db.get(WorkspaceRecord,1)
        return WorkspaceState(revision=row.revision, active_symbol=row.active_symbol,
            entries=[WatchEntry(symbol=r.symbol,name=r.name) for r in db.scalars(
                select(WatchlistRecord).order_by(WatchlistRecord.position,WatchlistRecord.symbol))])

    def state(self):
        with self.database.sessions() as db:
            return self._state(db)

    def add(self, symbol):
        symbol=SymbolInput(symbol=symbol).symbol
        with self.database.write() as db:
            if db.get(WatchlistRecord,symbol) is None:
                rows=list(db.scalars(select(WatchlistRecord)))
                if len(rows)>=20: raise WatchlistError('自选最多保存20只证券。')
                db.add(WatchlistRecord(symbol=symbol,name=self.catalog.get(symbol,symbol),
                    position=max((r.position for r in rows),default=-1)+1))
                row=db.get(WorkspaceRecord,1); row.revision+=1
                if row.active_symbol is None: row.active_symbol=symbol
                db.flush()
            return self._state(db)

    def select(self, symbol):
        symbol=SymbolInput(symbol=symbol).symbol
        with self.database.write() as db:
            row=db.get(WorkspaceRecord,1)
            if row.active_symbol!=symbol: row.active_symbol=symbol; row.revision+=1
            return self._state(db)

    def delete(self, symbol):
        symbol=SymbolInput(symbol=symbol).symbol
        with self.database.write() as db:
            item=db.get(WatchlistRecord,symbol)
            if item is not None:
                db.delete(item); db.flush()
                row=db.get(WorkspaceRecord,1); row.revision+=1
                if row.active_symbol==symbol:
                    row.active_symbol=next(iter(db.scalars(select(WatchlistRecord.symbol).order_by(
                        WatchlistRecord.position,WatchlistRecord.symbol))),None)
            return self._state(db)
