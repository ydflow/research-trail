from contextlib import contextmanager
import os
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import URL, create_engine, event
from sqlalchemy.orm import sessionmaker
from .runtime_paths import backend_resources, database_path


def default_database_path() -> Path:
    return database_path()


class Database:
    def __init__(self, path: Path | str):
        self.path = Path(path).resolve()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.engine = create_engine(URL.create("sqlite", database=str(self.path)),
                                    connect_args={"check_same_thread": False, "timeout": 5})

        @event.listens_for(self.engine, "connect")
        def configure(connection, _record):
            cursor = connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.execute("PRAGMA busy_timeout=5000")
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.close()

        self.sessions = sessionmaker(self.engine, expire_on_commit=False)

    def migrate(self):
        cfg = Config(str(backend_resources() / "alembic.ini"))
        # The write lock also serializes version-table creation across two app instances.
        with self.engine.connect() as connection:
            self.migration_transaction(connection, lambda: command.upgrade(cfg, "head"), cfg)

    @staticmethod
    def migration_transaction(connection, migrate, cfg=None):
        # SQLite batch alters rebuild the parent table. Disable FK enforcement only
        # on this isolated migration connection, then check integrity before commit.
        connection.exec_driver_sql("PRAGMA foreign_keys=OFF")
        connection.commit()
        try:
            connection.exec_driver_sql("BEGIN IMMEDIATE")
            if cfg is not None:
                cfg.attributes["connection"] = connection
            migrate()
            if connection.exec_driver_sql("PRAGMA foreign_key_check").fetchone() is not None:
                raise RuntimeError("数据库迁移后的外键检查失败。")
            connection.commit()
        except BaseException:
            connection.rollback()
            raise
        finally:
            connection.exec_driver_sql("PRAGMA foreign_keys=ON")
            connection.commit()

    @contextmanager
    def write(self):
        with self.sessions() as session:
            session.connection().exec_driver_sql("BEGIN IMMEDIATE")
            try:
                yield session
                session.commit()
            except BaseException:
                session.rollback()
                raise

    def close(self):
        self.engine.dispose()
