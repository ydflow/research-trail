"""Original synthetic old schema, restricted to a new Temp QA database."""
from pathlib import Path
from tempfile import gettempdir
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'services/backend'))
from alembic import command
from alembic.config import Config
from research_trail.database import Database

path = Path(sys.argv[1]).resolve()
if not path.is_relative_to(Path(gettempdir()).resolve()) or path.exists():
    raise SystemExit('Only a new Temp database is allowed')
database = Database(path)
cfg = Config('alembic.ini')
with database.engine.connect() as connection:
    database.migration_transaction(connection, lambda: command.upgrade(cfg, '0017_evaluation'), cfg)
with database.engine.begin() as connection:
    connection.exec_driver_sql("INSERT INTO sessions (id,title,created_at,updated_at) VALUES (?,?,?,?)",
        ('11111111-2222-4333-8444-555555555555','原创旧库升级验收','2024-01-16T21:00:00+00:00','2024-01-16T21:00:00+00:00'))
database.close()
print('Synthetic 0017 database prepared; no user database touched')
