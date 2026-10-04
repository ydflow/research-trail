from alembic import context
from research_trail.database import Database, default_database_path
from research_trail.models import Base


def run(connection):
    context.configure(connection=connection, target_metadata=Base.metadata, render_as_batch=True)
    with context.begin_transaction():
        context.run_migrations()


provided = context.config.attributes.get("connection")
if provided is not None:
    run(provided)
else:
    database = Database(default_database_path())
    try:
        with database.engine.connect() as connection:
            database.migration_transaction(connection, lambda: run(connection))
    finally:
        database.close()
